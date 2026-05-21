import { randomUUID } from 'node:crypto';

import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  CustomerAddress,
  FoodOrder,
  FoodOrderItem,
  OrderPriceSnapshot,
  OrderReview,
  OrderTimeline,
  PaymentOrder,
  Product,
  ProductSku,
  RefundOrder,
  StockLock,
  Store,
} from '../../database/entities';
import type { OrderPriceSnapshotPayload } from '../../database/entities/order-price-snapshot.entity';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { CouponCustomerService } from '../coupon/coupon-customer.service';
import { CouponService } from '../coupon/coupon.service';

import {
  type CancelOrderDto,
  type CancelOrderVo,
  type FoodOrderDetailVo,
  type FoodOrderListPageVo,
  type ListOrdersQueryDto,
  type PreviewOrderDto,
  type PreviewVo,
  type ReviewOrderDto,
  type ReviewOrderVo,
  type SubmitOrderDto,
  type SubmitOrderVo,
  type TimelineEntryVo,
} from './food-order.dto';

const PREVIEW_TTL_SECONDS = 300;
const ESTIMATED_DELIVERY_MINUTES = 40;
const PREVIEW_REDIS_PREFIX = 'food:preview:';
const ORDER_PAY_TIMEOUT_MS = 15 * 60 * 1000;
const ORDER_NO_DAILY_KEY_PREFIX = 'seq:order:food:';

@Injectable()
export class FoodOrderService {
  constructor(
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    @InjectRepository(CustomerAddress) private readonly addressRepo: Repository<CustomerAddress>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductSku) private readonly skuRepo: Repository<ProductSku>,
    @InjectRepository(OrderPriceSnapshot) private readonly snapshotRepo: Repository<OrderPriceSnapshot>,
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(FoodOrderItem) private readonly orderItemRepo: Repository<FoodOrderItem>,
    @InjectRepository(OrderTimeline) private readonly timelineRepo: Repository<OrderTimeline>,
    @InjectRepository(OrderReview) private readonly reviewRepo: Repository<OrderReview>,
    @InjectRepository(PaymentOrder) private readonly paymentRepo: Repository<PaymentOrder>,
    @InjectRepository(RefundOrder) private readonly refundRepo: Repository<RefundOrder>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    private readonly couponService: CouponService,
    private readonly couponCustomerService: CouponCustomerService,
  ) {}

  async preview(customerId: string, dto: PreviewOrderDto): Promise<PreviewVo> {
    if (dto.pointsUsed && dto.pointsUsed > 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        detail: 'POINTS_NOT_AVAILABLE',
        message: '积分功能即将上线',
      });
    }

    // 1. 校验 store
    const store = await this.storeRepo.findOne({ where: { storeId: dto.storeId } });
    if (!store) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'store not found' });
    if (store.businessStatus !== 'online') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'STORE_CLOSED',
        message: '店铺已休息',
      });
    }

    // 2. 校验 address(必属本人)
    const address = await this.addressRepo.findOne({ where: { addressId: dto.addressId, userId: customerId } });
    if (!address) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ADDRESS_NOT_FOUND',
        message: '地址不存在',
      });
    }

    // 3. 校验配送范围 — 简化为 cityCode 一致(stage 8 接 amap-distance + 多边形包含)
    if (store.cityCode && address.cityCode && store.cityCode !== address.cityCode) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'OUT_OF_DELIVERY_RANGE',
        message: '该地址超出配送范围',
      });
    }

    // 4. 校验预约时间(stage 5:必须未来)
    if (dto.deliveryType === 'reserved') {
      if (!dto.reservedTime || dto.reservedTime <= Date.now()) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'RESERVED_TIME_PAST',
          message: '预约时间已过',
        });
      }
    }

    // 5. 拉 sku + 校验所属 store + 库存
    const skuIds = dto.items.map((i) => i.skuId);
    const skus = await this.skuRepo.find({ where: { skuId: In(skuIds) } });
    if (skus.length !== skuIds.length) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, detail: 'SKU_NOT_FOUND', message: '商品不存在' });
    }
    const productIds = Array.from(new Set(skus.map((s) => s.productId)));
    const productRows = await this.productRepo.find({ where: { productId: In(productIds) } });
    const productMap = new Map(productRows.map((p) => [p.productId, p]));
    for (const sku of skus) {
      const p = productMap.get(sku.productId);
      if (!p || p.storeId !== dto.storeId) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'SKU_STORE_MISMATCH',
          message: '商品不属于该店铺',
        });
      }
      if (p.saleStatus !== 'on_shelf') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'PRODUCT_NOT_ON_SHELF',
          message: '商品未上架',
        });
      }
      const need = dto.items.find((i) => i.skuId === sku.skuId)!.quantity;
      const avail = sku.stock - sku.stockLocked;
      if (avail < need) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'STOCK_INSUFFICIENT',
          message: '部分商品库存不足',
        });
      }
    }

    // 6. 计算金额
    const skuMap = new Map(skus.map((s) => [s.skuId, s]));
    let goods = BigInt(0);
    const items: OrderPriceSnapshotPayload['items'] = dto.items.map((it) => {
      const sku = skuMap.get(it.skuId)!;
      const product = productMap.get(sku.productId)!;
      const unit = BigInt(sku.price);
      const sub = unit * BigInt(it.quantity);
      goods += sub;
      return {
        skuId: it.skuId,
        productId: sku.productId,
        quantity: it.quantity,
        unitPrice: String(unit),
        subTotal: String(sub),
        skuSnapshot: {
          name: product.name,
          price: Number(sku.price),
          spec: sku.specValue,
          iconUrl: product.coverImageFileId,
          productName: product.name,
        },
      };
    });

    const minOrder = BigInt(store.minOrderAmount || '0');
    if (goods < minOrder) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'BELOW_MIN_ORDER',
        message: '未达起送金额',
      });
    }

    const deliveryFee = BigInt(store.deliveryFee || '0');
    // 优惠券抵扣 — couponId 字段语义是 user_coupon_id
    let discount = BigInt(0);
    let userCouponId: string | null = null;
    let couponName: string | null = null;
    if (dto.couponId) {
      const r = await this.couponCustomerService.validateForOrder(customerId, dto.couponId, 'FOOD', goods);
      discount = r.discountCents;
      userCouponId = r.userCouponId;
      couponName = r.couponName;
    }
    let payable = goods + deliveryFee - discount;
    if (payable < 0n) payable = 0n;

    // 7. 写 snapshot
    const previewId = randomUUID();
    const now = Date.now();
    const expiresAt = now + PREVIEW_TTL_SECONDS * 1000;
    const payload: OrderPriceSnapshotPayload = {
      storeId: dto.storeId,
      cityCode: store.cityCode ?? address.cityCode,
      items,
      goodsAmount: String(goods),
      deliveryFee: String(deliveryFee),
      discountAmount: String(discount),
      payableAmount: String(payable),
      estimatedDeliveryTime: ESTIMATED_DELIVERY_MINUTES,
      deliveryType: dto.deliveryType,
      reservedTime: dto.reservedTime ? String(dto.reservedTime) : null,
      userCouponId,
      couponName,
      addressSnapshot: {
        addressId: address.addressId,
        consignee: address.receiverName,
        mobile: address.mobile,
        province: '',
        city: '',
        district: '',
        detail: address.detail,
        lng: Number(address.lng),
        lat: Number(address.lat),
      },
    };
    await this.snapshotRepo.insert({
      previewId,
      customerId,
      storeId: dto.storeId,
      payload,
      createdAt: String(now),
      expiresAt: String(expiresAt),
    });
    await this.redis
      .set(`${PREVIEW_REDIS_PREFIX}${previewId}`, JSON.stringify(payload), 'EX', PREVIEW_TTL_SECONDS)
      .catch(() => undefined);

    return {
      previewId,
      expiresAt,
      goodsAmount: String(goods),
      deliveryFee: String(deliveryFee),
      discountAmount: String(discount),
      payableAmount: String(payable),
      estimatedDeliveryTime: ESTIMATED_DELIVERY_MINUTES,
    };
  }

  async submit(customerId: string, dto: SubmitOrderDto): Promise<SubmitOrderVo> {
    // 1. 查 snapshot(必须属本人 + 未过期)
    const snapshot = await this.snapshotRepo.findOne({ where: { previewId: dto.previewId } });
    if (!snapshot || snapshot.customerId !== customerId) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PREVIEW_NOT_FOUND',
        message: '试算单不存在或已失效',
      });
    }
    if (Number(snapshot.expiresAt) < Date.now()) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PREVIEW_EXPIRED',
        message: '价格已变动,请重新确认',
      });
    }
    const payload = snapshot.payload;

    // 3. 事务:锁 sku → 写 stock_lock + INSERT food_order + items + timeline + 锁 coupon
    const orderNo = await this.generateOrderNo();
    const now = Date.now();
    const expireAt = now + ORDER_PAY_TIMEOUT_MS;

    const result = await this.dataSource.transaction(async (em: EntityManager) => {
      // 锁 sku
      const skuIds = payload.items.map((i) => i.skuId);
      const lockedSkus = await em
        .getRepository(ProductSku)
        .createQueryBuilder('s')
        .where('s.sku_id IN (:...ids)', { ids: skuIds })
        .setLock('pessimistic_write')
        .getMany();
      const skuMap = new Map(lockedSkus.map((s) => [s.skuId, s]));
      for (const it of payload.items) {
        const sku = skuMap.get(it.skuId);
        if (!sku) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'STOCK_INSUFFICIENT_AT_SUBMIT',
            message: '商品已下架,请重新选择',
          });
        }
        const avail = sku.stock - sku.stockLocked;
        if (avail < it.quantity) {
          throw new UnprocessableEntityException({
            code: ErrorCode.STATUS_INVALID,
            detail: 'STOCK_INSUFFICIENT_AT_SUBMIT',
            message: '商品已售罄,请重新选择',
          });
        }
      }

      // 累加 stock_locked
      for (const it of payload.items) {
        await em.getRepository(ProductSku).increment({ skuId: it.skuId }, 'stockLocked', it.quantity);
      }

      // INSERT food_order
      const insertOrder = await em.getRepository(FoodOrder).insert({
        orderNo,
        customerId,
        storeId: payload.storeId,
        cityCode: payload.cityCode,
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        deliveryType: payload.deliveryType,
        reservedTime: payload.reservedTime ?? null,
        goodsAmount: payload.goodsAmount,
        deliveryFee: payload.deliveryFee,
        discountAmount: payload.discountAmount,
        payableAmount: payload.payableAmount,
        addressSnapshot: payload.addressSnapshot,
        remark: dto.remark ?? null,
        expireAt: String(expireAt),
        createdAt: String(now),
        updatedAt: String(now),
      });
      const orderId = String(insertOrder.identifiers[0]?.foodOrderId ?? '');

      // INSERT food_order_item × N
      for (const it of payload.items) {
        await em.getRepository(FoodOrderItem).insert({
          foodOrderId: orderId,
          skuId: it.skuId,
          productId: it.productId,
          skuSnapshot: it.skuSnapshot,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subTotal: it.subTotal,
          createdAt: String(now),
        });
      }

      // INSERT stock_lock × N
      for (const it of payload.items) {
        await em.getRepository(StockLock).insert({
          orderId,
          skuId: it.skuId,
          quantity: it.quantity,
          status: 'active',
          createdAt: String(now),
        });
      }

      // INSERT order_timeline (NULL → WAIT_PAY)
      await em.getRepository(OrderTimeline).insert({
        orderId,
        bizType: 'FOOD',
        fromStatus: null,
        toStatus: 'WAIT_PAY',
        actorType: 'customer',
        actorId: customerId,
        reason: 'order submitted',
        createdAt: String(now),
      });

      // 锁优惠券(user_coupon UNUSED → USED + 写 coupon_lock active)
      if (payload.userCouponId) {
        await this.couponService.lockCoupons(em, orderId, payload.userCouponId, customerId);
      }

      return { orderId };
    });

    // 4. 发事件(事务外,失败由 retry-job 兜底)
    await this.eventBus.publish(
      EventName.FoodOrderCreated,
      {
        orderId: result.orderId,
        orderNo,
        customerId,
        storeId: payload.storeId,
        payableAmount: payload.payableAmount,
        expireAt,
        createdAt: now,
      },
      { bizType: 'food-order', bizId: result.orderId },
    );

    return {
      orderId: result.orderId,
      orderNo,
      payableAmount: payload.payableAmount,
      expireAt,
    };
  }

  // === T12 list/detail ===

  async list(customerId: string, query: ListOrdersQueryDto): Promise<FoodOrderListPageVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    let qb = this.orderRepo.createQueryBuilder('o').where('o.customer_id = :cid', { cid: customerId });
    if (query.status) qb = qb.andWhere('o.status = :st', { st: query.status });
    qb = qb.orderBy('o.created_at', 'DESC');
    const total = await qb.getCount();
    const orders = await qb
      .skip((pageNo - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const orderIds = orders.map((o) => o.foodOrderId);
    const items = orderIds.length ? await this.orderItemRepo.find({ where: { foodOrderId: In(orderIds) } }) : [];
    const itemsByOrder = new Map<string, FoodOrderItem[]>();
    for (const it of items) {
      const arr = itemsByOrder.get(it.foodOrderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.foodOrderId, arr);
    }

    return {
      pageNo,
      pageSize,
      total,
      list: orders.map((o) => {
        const its = itemsByOrder.get(o.foodOrderId) ?? [];
        const first = its[0];
        const totalQty = its.reduce((acc, x) => acc + x.quantity, 0);
        const itemsBrief = first
          ? `${first.skuSnapshot.name ?? '商品'}${its.length > 1 ? ` 等 ${its.length} 件` : ` × ${first.quantity}`}（共 ${totalQty} 件）`
          : '';
        return {
          orderId: o.foodOrderId,
          orderNo: o.orderNo,
          status: o.status,
          payStatus: o.payStatus,
          storeId: o.storeId,
          goodsAmount: o.goodsAmount,
          payableAmount: o.payableAmount,
          itemsBrief,
          expireAt: Number(o.expireAt),
          createdAt: Number(o.createdAt),
        };
      }),
    };
  }

  async detail(customerId: string, orderId: string): Promise<FoodOrderDetailVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    const items = await this.orderItemRepo.find({ where: { foodOrderId: orderId } });
    const timelineRows = await this.timelineRepo.find({ where: { orderId } });
    timelineRows.sort((a, b) => Number(a.createdAt) - Number(b.createdAt));
    const timeline: TimelineEntryVo[] = timelineRows.map((t) => ({
      fromStatus: t.fromStatus,
      toStatus: t.toStatus,
      actorType: t.actorType,
      reason: t.reason,
      createdAt: Number(t.createdAt),
    }));
    const payment = await this.paymentRepo.findOne({
      where: { bizType: 'FOOD', bizId: orderId },
    });
    const actions: string[] = [];
    if (order.status === 'WAIT_PAY') {
      actions.push('pay', 'cancel');
    }
    if (order.status === 'COMPLETED') {
      const reviewed = await this.reviewRepo.findOne({ where: { orderId } });
      if (!reviewed) actions.push('review');
    }
    return {
      orderId: order.foodOrderId,
      orderNo: order.orderNo,
      status: order.status,
      payStatus: order.payStatus,
      storeId: order.storeId,
      goodsAmount: order.goodsAmount,
      deliveryFee: order.deliveryFee,
      discountAmount: order.discountAmount,
      payableAmount: order.payableAmount,
      addressSnapshot: order.addressSnapshot,
      expireAt: Number(order.expireAt),
      paidAt: order.paidAt ? Number(order.paidAt) : null,
      cancelledAt: order.cancelledAt ? Number(order.cancelledAt) : null,
      cancelledBy: order.cancelledBy,
      cancelledReason: order.cancelledReason,
      createdAt: Number(order.createdAt),
      items: items.map((it) => ({
        skuId: it.skuId,
        name: it.skuSnapshot.name ?? '',
        spec: it.skuSnapshot.spec ?? null,
        iconUrl: it.skuSnapshot.iconUrl ?? null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subTotal: it.subTotal,
      })),
      timeline,
      payment: payment
        ? {
            payOrderId: payment.paymentOrderId,
            payOrderNo: payment.payOrderNo,
            payChannel: payment.payChannel,
            status: payment.status,
          }
        : null,
      actions,
    };
  }

  // === T13 cancel ===

  async cancel(customerId: string, orderId: string, dto: CancelOrderDto): Promise<CancelOrderVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    if (order.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'INVALID_TRANSITION',
        message: `${order.status} → CANCELLED 不允许`,
      });
    }
    const now = Date.now();
    const reason = dto.reason ?? 'CUSTOMER_CANCEL';
    const releasedItems: Array<{ skuId: string; quantity: number }> = [];

    // 检测 race:status=WAIT_PAY 但 PaymentOrder 已 success(回调慢于取消)→ 需触发退款
    const paidPayment = await this.paymentRepo.findOne({
      where: { bizType: 'FOOD', bizId: orderId, status: 'success' },
    });

    let createdRefund: RefundOrder | null = null;
    await this.dataSource.transaction(async (em: EntityManager) => {
      await em.getRepository(FoodOrder).update(
        { foodOrderId: orderId },
        {
          status: 'CANCELLED',
          cancelledAt: String(now),
          cancelledBy: 'customer',
          cancelledReason: reason,
          updatedAt: String(now),
        },
      );
      const locks = await em.getRepository(StockLock).find({ where: { orderId, status: 'active' } });
      for (const lock of locks) {
        await em
          .getRepository(StockLock)
          .update({ stockLockId: lock.stockLockId }, { status: 'released', releasedAt: String(now) });
        await em.getRepository(ProductSku).decrement({ skuId: lock.skuId }, 'stockLocked', lock.quantity);
        releasedItems.push({ skuId: lock.skuId, quantity: lock.quantity });
      }
      // 释放优惠券(coupon_lock active → released + user_coupon USED → UNUSED)
      await this.couponService.releaseCoupons(em, orderId);

      await em.getRepository(OrderTimeline).insert({
        orderId,
        bizType: 'FOOD',
        fromStatus: 'WAIT_PAY',
        toStatus: 'CANCELLED',
        actorType: 'customer',
        actorId: customerId,
        reason,
        createdAt: String(now),
      });

      // 已支付 → 生成 refund_order(mock 即时 SUCCESS;真退款由 W2 接 wxpay)
      if (paidPayment) {
        const amount = paidPayment.paidAmount ?? paidPayment.payableAmount;
        const refundNo = `R${now}${orderId.padStart(8, '0').slice(-8)}`;
        const insertRes = await em.getRepository(RefundOrder).insert({
          refundNo,
          bizType: 'FOOD',
          bizOrderId: orderId,
          paymentOrderId: paidPayment.paymentOrderId,
          amount,
          status: 'SUCCESS',
          provider: paidPayment.payChannel,
          providerRefundId: `mock_${refundNo}`,
          errorMessage: null,
          createdAt: String(now),
          updatedAt: String(now),
        });
        createdRefund = {
          refundOrderId: String(insertRes.identifiers[0]?.refundOrderId ?? ''),
          refundNo,
          bizType: 'FOOD',
          bizOrderId: orderId,
          paymentOrderId: paidPayment.paymentOrderId,
          amount,
          status: 'SUCCESS',
          provider: paidPayment.payChannel,
          providerRefundId: `mock_${refundNo}`,
          errorMessage: null,
          createdAt: String(now),
          updatedAt: String(now),
        } as RefundOrder;
        await em
          .getRepository(PaymentOrder)
          .update({ paymentOrderId: paidPayment.paymentOrderId }, { status: 'refunded', updatedAt: String(now) });
        await em
          .getRepository(FoodOrder)
          .update({ foodOrderId: orderId }, { payStatus: 'refunded', updatedAt: String(now) });
      }
    });

    await this.eventBus.publish(
      EventName.FoodOrderCancelled,
      {
        orderId,
        customerId,
        reason,
        cancelledBy: 'customer',
        cancelledAt: now,
      },
      { bizType: 'food-order', bizId: orderId },
    );
    if (releasedItems.length) {
      await this.eventBus.publish(
        EventName.StockReleased,
        {
          orderId,
          items: releasedItems,
          reason: 'CUSTOMER_CANCEL',
          releasedAt: now,
        },
        { bizType: 'food-order', bizId: orderId },
      );
    }
    if (createdRefund) {
      const refund = createdRefund as RefundOrder;
      await this.eventBus.publish(
        EventName.RefundExecuted,
        {
          refundOrderId: refund.refundOrderId,
          refundNo: refund.refundNo,
          bizType: 'FOOD',
          bizOrderId: orderId,
          amount: refund.amount,
          status: 'SUCCESS' as const,
          executedAt: now,
        },
        { bizType: 'refund', bizId: refund.refundOrderId },
      );
    }

    return { orderId, status: 'CANCELLED', cancelledAt: now };
  }

  // === T14 review ===

  async review(customerId: string, orderId: string, dto: ReviewOrderDto): Promise<ReviewOrderVo> {
    const order = await this.orderRepo.findOne({ where: { foodOrderId: orderId } });
    if (!order || order.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    if (order.status !== 'COMPLETED') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'NOT_COMPLETED',
        message: '当前订单无法评价',
      });
    }
    const completedAt = order.completedAt ? Number(order.completedAt) : Number(order.updatedAt);
    if (Date.now() - completedAt > 30 * 24 * 60 * 60 * 1000) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'REVIEW_EXPIRED',
        message: '评价已过期(超过 30 天)',
      });
    }
    const existing = await this.reviewRepo.findOne({ where: { orderId } });
    if (existing) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'ALREADY_REVIEWED',
        message: '订单已评价',
      });
    }
    const now = Date.now();
    const ins = await this.reviewRepo.insert({
      orderId,
      customerId,
      storeId: order.storeId,
      rating: dto.rating,
      content: dto.content ?? null,
      imageFileIds: dto.images ?? null,
      anonymous: dto.anonymous ? 1 : 0,
      createdAt: String(now),
    });
    const reviewId = String(ins.identifiers[0]?.orderReviewId ?? '');
    await this.eventBus.publish(
      EventName.FoodReviewCreated,
      {
        reviewId,
        orderId,
        customerId,
        storeId: order.storeId,
        rating: dto.rating,
        createdAt: now,
      },
      { bizType: 'order-review', bizId: reviewId },
    );
    return { reviewId, createdAt: now };
  }

  /** orderNo = `${yyyyMMdd}${redis incr daily 6位}`,Redis 不可用时回退到时间戳后 6 位 */
  private async generateOrderNo(): Promise<string> {
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const ymd = `${y}${m}${d}`;
    let seq = 0;
    try {
      seq = await this.redis.incr(`${ORDER_NO_DAILY_KEY_PREFIX}${ymd}`);
      if (seq === 1) {
        // 设过期到当日 24:00
        const endOfDay = new Date(y, date.getMonth(), date.getDate(), 23, 59, 59).getTime();
        const ttl = Math.max(60, Math.floor((endOfDay - Date.now()) / 1000));
        await this.redis.expire(`${ORDER_NO_DAILY_KEY_PREFIX}${ymd}`, ttl).catch(() => undefined);
      }
    } catch {
      seq = Number(String(Date.now()).slice(-6));
    }
    return `${ymd}${String(seq).padStart(6, '0')}`;
  }
}
