import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  GroceryOrder,
  GroceryOrderItem,
  PickupPoint,
  PickupTimeSlot,
  Product,
  type ProductPricingMode,
  type ProductWeightUnit,
  Store,
} from '../../database/entities';

import type {
  CancelGroceryOrderDto,
  CancelGroceryOrderVo,
  GroceryOrderDetailVo,
  GroceryOrderListPageVo,
  ListGroceryOrdersQueryDto,
  PreviewGroceryOrderDto,
  PreviewGroceryOrderVo,
  SubmitGroceryOrderDto,
  SubmitGroceryOrderVo,
} from './grocery-order.dto';

const PREVIEW_TTL_SECONDS = 300;
const PREVIEW_REDIS_PREFIX = 'grocery:preview:';
const ORDER_PAY_TIMEOUT_MS = 15 * 60 * 1000;
const ORDER_NO_DAILY_KEY_PREFIX = 'seq:order:grocery:';

interface PreviewSnapshotItem {
  productId: string;
  productName: string;
  coverImageFileId: string | null;
  pricingMode: ProductPricingMode;
  weightUnit: ProductWeightUnit | null;
  unitPrice: string;
  quantity: number;
  estimatedSubtotal: string;
}

interface PreviewSnapshot {
  customerId: string;
  merchantId: string;
  pickupPointId: string;
  pickupSlotId: string;
  pickupDate: string;
  pickupStartMinute: number;
  pickupEndMinute: number;
  items: PreviewSnapshotItem[];
  estimatedGoodsAmount: string;
  discountAmount: string;
  estimatedPayableAmount: string;
  userCouponId?: string | null;
}

@Injectable()
export class GroceryOrderService {
  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryOrderItem) private readonly itemRepo: Repository<GroceryOrderItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(PickupPoint) private readonly pointRepo: Repository<PickupPoint>,
    @InjectRepository(PickupTimeSlot) private readonly slotRepo: Repository<PickupTimeSlot>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
  ) {}

  // ===================== Preview =====================

  async preview(customerId: string, dto: PreviewGroceryOrderDto): Promise<PreviewGroceryOrderVo> {
    const point = await this.pointRepo.findOne({ where: { pickupPointId: dto.pickupPointId } });
    if (!point || point.status !== 1) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'pickup point unavailable' });
    }
    const slot = await this.slotRepo.findOne({ where: { slotId: dto.pickupSlotId } });
    if (!slot || slot.pickupPointId !== dto.pickupPointId || slot.status !== 1) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'SLOT_INVALID',
        message: '提货时段无效',
      });
    }
    if (slot.reserved >= slot.capacity) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'SLOT_FULL',
        message: '该时段已满',
      });
    }
    const slotStartMs = new Date(`${slot.slotDate}T00:00:00.000`).getTime() + slot.startMinute * 60_000;
    if (slotStartMs <= Date.now() + 30 * 60_000) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'SLOT_TOO_SOON',
        message: '该时段无法预约,请选稍晚时段',
      });
    }

    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productRepo.find({ where: { productId: In(productIds) } });
    const pMap = new Map(products.map((p) => [p.productId, p]));

    const merchantIds = new Set<string>();
    const snapshotItems: PreviewSnapshotItem[] = [];
    let goodsAmount = BigInt(0);

    for (const i of dto.items) {
      const p = pMap.get(i.productId);
      if (!p || p.productType !== 'grocery') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'PRODUCT_INVALID',
          message: `商品 ${i.productId} 不可购买`,
        });
      }
      if (p.saleStatus !== 'on_shelf') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'PRODUCT_OFF_SHELF',
          message: `${p.name} 已下架`,
        });
      }
      if (p.stock < i.quantity) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'STOCK_INSUFFICIENT',
          message: `${p.name} 库存不足`,
        });
      }
      const store = await this.storeRepo.findOne({ where: { storeId: p.storeId } });
      if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
      merchantIds.add(store.merchantId);

      let unitPrice: bigint;
      let subtotal: bigint;
      if (p.pricingMode === 'weighed') {
        if (!p.unitPricePerJin) {
          throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'PRICING_MISSING' });
        }
        if (p.minWeightG && i.quantity < p.minWeightG) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'BELOW_MIN_WEIGHT',
            message: `${p.name} 起售 ${p.minWeightG}g`,
          });
        }
        if (p.maxWeightG && i.quantity > p.maxWeightG) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'ABOVE_MAX_WEIGHT',
            message: `${p.name} 单次上限 ${p.maxWeightG}g`,
          });
        }
        unitPrice = BigInt(p.unitPricePerJin);
        // 单价 元/斤; 1 斤 = 500g; subtotal_cents = unitPrice * grams / 500
        subtotal = (unitPrice * BigInt(i.quantity)) / BigInt(500);
      } else {
        unitPrice = BigInt(p.price);
        subtotal = unitPrice * BigInt(i.quantity);
      }
      goodsAmount += subtotal;
      snapshotItems.push({
        productId: p.productId,
        productName: p.name,
        coverImageFileId: p.coverImageFileId,
        pricingMode: p.pricingMode,
        weightUnit: p.weightUnit,
        unitPrice: String(unitPrice),
        quantity: i.quantity,
        estimatedSubtotal: String(subtotal),
      });
    }

    if (merchantIds.size !== 1) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'CROSS_MERCHANT',
        message: '请按商家分别下单',
      });
    }
    const merchantId = Array.from(merchantIds)[0]!;

    // TODO(优惠券): coupon scope=GROCERY,扣减 discountAmount
    const discountAmount = BigInt(0);
    const payable = goodsAmount - discountAmount;

    const previewId = randomUUID();
    const snap: PreviewSnapshot = {
      customerId,
      merchantId,
      pickupPointId: dto.pickupPointId,
      pickupSlotId: dto.pickupSlotId,
      pickupDate: slot.slotDate,
      pickupStartMinute: slot.startMinute,
      pickupEndMinute: slot.endMinute,
      items: snapshotItems,
      estimatedGoodsAmount: String(goodsAmount),
      discountAmount: String(discountAmount),
      estimatedPayableAmount: String(payable),
      userCouponId: dto.userCouponId ?? null,
    };
    await this.redis.set(`${PREVIEW_REDIS_PREFIX}${previewId}`, JSON.stringify(snap), 'EX', PREVIEW_TTL_SECONDS);

    return {
      previewId,
      expireSeconds: PREVIEW_TTL_SECONDS,
      items: snapshotItems.map((it, idx) => ({
        groceryOrderItemId: String(idx),
        productId: it.productId,
        productName: it.productName,
        coverImageFileId: it.coverImageFileId,
        pricingMode: it.pricingMode,
        weightUnit: it.weightUnit,
        unitPrice: it.unitPrice,
        estimatedQuantity: it.quantity,
        actualQuantity: null,
        estimatedSubtotal: it.estimatedSubtotal,
        actualSubtotal: null,
      })),
      estimatedGoodsAmount: snap.estimatedGoodsAmount,
      discountAmount: snap.discountAmount,
      estimatedPayableAmount: snap.estimatedPayableAmount,
      hasWeighedItem: snapshotItems.some((it) => it.pricingMode === 'weighed'),
      pickupPointId: snap.pickupPointId,
      pickupSlotId: snap.pickupSlotId,
      pickupDate: snap.pickupDate,
      pickupStartMinute: snap.pickupStartMinute,
      pickupEndMinute: snap.pickupEndMinute,
    };
  }

  // ===================== Submit =====================

  async submit(customerId: string, dto: SubmitGroceryOrderDto): Promise<SubmitGroceryOrderVo> {
    const raw = await this.redis.get(`${PREVIEW_REDIS_PREFIX}${dto.previewId}`);
    if (!raw) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PREVIEW_EXPIRED',
        message: '试算单已失效,请重新试算',
      });
    }
    const snap = JSON.parse(raw) as PreviewSnapshot;
    if (snap.customerId !== customerId) {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'PREVIEW_OWNER_MISMATCH' });
    }

    const orderNo = await this.generateOrderNo();
    const now = Date.now();
    const expireAt = now + ORDER_PAY_TIMEOUT_MS;

    const result = await this.dataSource.transaction(async (em: EntityManager) => {
      // 1) 锁时段 + 校验剩余
      const slot = await em
        .getRepository(PickupTimeSlot)
        .createQueryBuilder('s')
        .where('s.slot_id = :id', { id: snap.pickupSlotId })
        .setLock('pessimistic_write')
        .getOne();
      if (!slot || slot.reserved >= slot.capacity) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'SLOT_FULL',
          message: '时段已满',
        });
      }

      // 2) 锁 product 行,校验库存
      const productIds = snap.items.map((i) => i.productId);
      const lockedProducts = await em
        .getRepository(Product)
        .createQueryBuilder('p')
        .where('p.product_id IN (:...ids)', { ids: productIds })
        .setLock('pessimistic_write')
        .getMany();
      const pMap = new Map(lockedProducts.map((p) => [p.productId, p]));
      for (const it of snap.items) {
        const p = pMap.get(it.productId);
        if (!p || p.saleStatus !== 'on_shelf' || p.stock < it.quantity) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'STOCK_INSUFFICIENT_AT_SUBMIT',
            message: `${it.productName} 库存不足`,
          });
        }
      }

      // 3) 扣 product.stock + 占 slot.reserved
      for (const it of snap.items) {
        await em.getRepository(Product).decrement({ productId: it.productId }, 'stock', it.quantity);
      }
      await em.getRepository(PickupTimeSlot).increment({ slotId: snap.pickupSlotId }, 'reserved', 1);

      // 4) INSERT grocery_order
      const ins = await em.getRepository(GroceryOrder).insert({
        orderNo,
        customerId,
        merchantId: snap.merchantId,
        pickupPointId: snap.pickupPointId,
        pickupSlotId: snap.pickupSlotId,
        pickupDate: snap.pickupDate,
        pickupStartMinute: snap.pickupStartMinute,
        pickupEndMinute: snap.pickupEndMinute,
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        estimatedGoodsAmount: snap.estimatedGoodsAmount,
        discountAmount: snap.discountAmount,
        estimatedPayableAmount: snap.estimatedPayableAmount,
        couponId: snap.userCouponId ?? null,
        expireAt: String(expireAt),
        remark: dto.remark ?? null,
        createdAt: String(now),
        updatedAt: String(now),
      });
      const orderId = String(ins.identifiers[0]?.groceryOrderId ?? '');

      // 5) INSERT items
      for (const it of snap.items) {
        await em.getRepository(GroceryOrderItem).insert({
          groceryOrderId: orderId,
          productId: it.productId,
          skuId: null,
          productName: it.productName,
          coverImageFileId: it.coverImageFileId,
          pricingMode: it.pricingMode,
          weightUnit: it.weightUnit,
          unitPrice: it.unitPrice,
          estimatedQuantity: it.quantity,
          estimatedSubtotal: it.estimatedSubtotal,
        });
      }
      return { orderId };
    });

    await this.redis.del(`${PREVIEW_REDIS_PREFIX}${dto.previewId}`).catch(() => undefined);

    return {
      groceryOrderId: result.orderId,
      orderNo,
      estimatedPayableAmount: snap.estimatedPayableAmount,
      expireAt,
      payParams: {},
    };
  }

  // ===================== List / Detail / Cancel =====================

  async list(customerId: string, query: ListGroceryOrdersQueryDto): Promise<GroceryOrderListPageVo> {
    const pageNo = Math.max(1, Number(query.pageNo) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where: Record<string, unknown> = { customerId };
    if (query.status) where.status = query.status;
    const [list, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const orderIds = list.map((o) => o.groceryOrderId);
    const items = orderIds.length ? await this.itemRepo.find({ where: { groceryOrderId: In(orderIds) } }) : [];
    const itemMap = new Map<string, GroceryOrderItem[]>();
    for (const it of items) {
      const arr = itemMap.get(it.groceryOrderId) ?? [];
      arr.push(it);
      itemMap.set(it.groceryOrderId, arr);
    }
    return {
      items: list.map((o) => ({
        groceryOrderId: o.groceryOrderId,
        orderNo: o.orderNo,
        status: o.status,
        estimatedPayableAmount: o.estimatedPayableAmount,
        finalPayableAmount: o.finalPayableAmount,
        pickupDate: o.pickupDate,
        pickupStartMinute: o.pickupStartMinute,
        pickupEndMinute: o.pickupEndMinute,
        pickupPointId: o.pickupPointId,
        itemsPreview: (itemMap.get(o.groceryOrderId) ?? [])
          .slice(0, 3)
          .map((it) => ({ productName: it.productName, quantity: it.estimatedQuantity })),
        createdAt: Number(o.createdAt),
      })),
      total,
      pageNo,
      pageSize,
    };
  }

  async detail(customerId: string, orderId: string): Promise<GroceryOrderDetailVo> {
    const o = await this.orderRepo.findOne({ where: { groceryOrderId: orderId } });
    if (!o || o.customerId !== customerId) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'order not found' });
    }
    const its = await this.itemRepo.find({ where: { groceryOrderId: orderId } });
    return {
      groceryOrderId: o.groceryOrderId,
      orderNo: o.orderNo,
      status: o.status,
      payStatus: o.payStatus,
      pickupCode: o.pickupCode,
      pickupQrPayload: o.pickupCode ? `PICKUP:${o.orderNo}:${o.pickupCode}` : null,
      estimatedGoodsAmount: o.estimatedGoodsAmount,
      discountAmount: o.discountAmount,
      estimatedPayableAmount: o.estimatedPayableAmount,
      finalGoodsAmount: o.finalGoodsAmount,
      finalPayableAmount: o.finalPayableAmount,
      diffAmount: o.diffAmount,
      diffPayStatus: o.diffPayStatus,
      pickupPointId: o.pickupPointId,
      pickupDate: o.pickupDate,
      pickupStartMinute: o.pickupStartMinute,
      pickupEndMinute: o.pickupEndMinute,
      expireAt: Number(o.expireAt),
      paidAt: o.paidAt ? Number(o.paidAt) : null,
      pickedUpAt: o.pickedUpAt ? Number(o.pickedUpAt) : null,
      items: its.map((it) => ({
        groceryOrderItemId: it.groceryOrderItemId,
        productId: it.productId,
        productName: it.productName,
        coverImageFileId: it.coverImageFileId,
        pricingMode: it.pricingMode,
        weightUnit: it.weightUnit,
        unitPrice: it.unitPrice,
        estimatedQuantity: it.estimatedQuantity,
        actualQuantity: it.actualQuantity,
        estimatedSubtotal: it.estimatedSubtotal,
        actualSubtotal: it.actualSubtotal,
      })),
      createdAt: Number(o.createdAt),
    };
  }

  async cancel(customerId: string, orderId: string, dto: CancelGroceryOrderDto): Promise<CancelGroceryOrderVo> {
    const o = await this.orderRepo.findOne({ where: { groceryOrderId: orderId } });
    if (!o || o.customerId !== customerId) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    }
    if (o.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'NOT_CANCELLABLE',
        message: '当前状态不可取消',
      });
    }
    await this.releaseAndCancel(o, 'customer', dto.reason ?? null);
    return { groceryOrderId: orderId, status: 'CANCELLED' };
  }

  // 由 scheduler 调用:超时未付自动取消
  async cancelExpired(): Promise<number> {
    const now = Date.now();
    const list = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :s', { s: 'WAIT_PAY' })
      .andWhere('o.expire_at < :now', { now: String(now) })
      .limit(200)
      .getMany();
    let cnt = 0;
    for (const o of list) {
      try {
        await this.releaseAndCancel(o, 'system', 'pay timeout');
        cnt++;
      } catch {
        // ignore single failure
      }
    }
    return cnt;
  }

  private async releaseAndCancel(
    o: GroceryOrder,
    cancelledBy: 'customer' | 'system' | 'merchant' | 'admin',
    reason: string | null,
  ): Promise<void> {
    const now = Date.now();
    await this.dataSource.transaction(async (em) => {
      // 释放库存
      const items = await em.getRepository(GroceryOrderItem).find({ where: { groceryOrderId: o.groceryOrderId } });
      for (const it of items) {
        await em.getRepository(Product).increment({ productId: it.productId }, 'stock', it.estimatedQuantity);
      }
      // 释放时段
      await em.getRepository(PickupTimeSlot).decrement({ slotId: o.pickupSlotId }, 'reserved', 1);
      await em.getRepository(GroceryOrder).update(
        { groceryOrderId: o.groceryOrderId },
        {
          status: 'CANCELLED',
          cancelledAt: String(now),
          cancelledBy,
          cancelReason: reason,
          updatedAt: String(now),
        },
      );
    });
  }

  // ===================== 给 payment 调用 =====================

  /** 支付成功:WAIT_PAY → PAID_WAIT_PICKUP + 生成提货码 */
  async applyPaid(
    em: EntityManager,
    orderId: string,
    paidAmountCents: number,
    now: number,
    salt: string,
  ): Promise<{ alreadyPaid: boolean; pickupCode?: string }> {
    const o = await em.getRepository(GroceryOrder).findOne({ where: { groceryOrderId: orderId } });
    if (!o) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND });
    if (o.payStatus === 'paid') return { alreadyPaid: true };
    if (o.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'NOT_WAIT_PAY' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { createHash } = await import('node:crypto');
    const hash = createHash('sha256').update(`${code}${salt}`).digest('hex');
    await em.getRepository(GroceryOrder).update(
      { groceryOrderId: orderId },
      {
        status: 'PAID_WAIT_PICKUP',
        payStatus: 'paid',
        paidAmount: String(paidAmountCents),
        paidAt: String(now),
        pickupCode: code,
        pickupCodeHash: hash,
        updatedAt: String(now),
      },
    );
    return { alreadyPaid: false, pickupCode: code };
  }

  // ===================== 工具 =====================

  /** 预付时 payment 服务用 */
  async fetchPayableForPrepay(
    orderId: string,
    customerId: string,
  ): Promise<{ payableAmount: string; expireAt: string }> {
    const o = await this.orderRepo.findOne({ where: { groceryOrderId: orderId } });
    if (!o || o.customerId !== customerId) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'ORDER_NOT_FOUND' });
    }
    if (o.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'ORDER_NOT_PAYABLE' });
    }
    if (Number(o.expireAt) < Date.now()) {
      throw new UnprocessableEntityException({ code: ErrorCode.STATUS_INVALID, detail: 'ORDER_EXPIRED' });
    }
    return { payableAmount: o.estimatedPayableAmount, expireAt: o.expireAt };
  }

  private async generateOrderNo(): Promise<string> {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const ymd = `${y}${m}${day}`;
    let seq = 0;
    try {
      seq = await this.redis.incr(`${ORDER_NO_DAILY_KEY_PREFIX}${ymd}`);
      if (seq === 1) {
        const endOfDay = new Date(y, d.getMonth(), d.getDate(), 23, 59, 59).getTime();
        const ttl = Math.max(60, Math.floor((endOfDay - Date.now()) / 1000));
        await this.redis.expire(`${ORDER_NO_DAILY_KEY_PREFIX}${ymd}`, ttl).catch(() => undefined);
      }
    } catch {
      seq = Number(String(Date.now()).slice(-6));
    }
    return `G${ymd}${String(seq).padStart(6, '0')}`;
  }
}
