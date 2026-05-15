import { ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { plainToInstance } from 'class-transformer';
import { Repository } from 'typeorm';

import { GroceryOrder, GroceryOrderItem, GroceryProduct, PickupPoint } from '../../database/entities';

import {
  CancelGroceryOrderDto,
  GroceryOrderItemVo,
  GroceryOrderMutationVo,
  GroceryOrderVo,
  ListGroceryOrdersQueryDto,
  ListGroceryOrdersVo,
  SubmitGroceryOrderDto,
} from './grocery-order.dto';

@Injectable()
export class GroceryOrderService {
  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryOrderItem) private readonly itemRepo: Repository<GroceryOrderItem>,
    @InjectRepository(GroceryProduct) private readonly prodRepo: Repository<GroceryProduct>,
    @InjectRepository(PickupPoint) private readonly pickupRepo: Repository<PickupPoint>,
  ) {}

  async submit(customerId: string, dto: SubmitGroceryOrderDto): Promise<GroceryOrderMutationVo> {
    const pickup = await this.pickupRepo.findOne({ where: { pickupPointId: dto.pickupPointId } });
    if (!pickup || pickup.status !== 'active') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: 'pickup point not available',
      });
    }

    // 拉所有商品做有效性 + 锁价
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prodRepo
      .createQueryBuilder('p')
      .where('p.product_id IN (:...ids)', { ids: productIds })
      .getMany();
    const prodMap = new Map(products.map((p) => [p.productId, p]));

    for (const it of dto.items) {
      const p = prodMap.get(it.productId);
      if (!p) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: `product ${it.productId} not found`,
        });
      }
      if (p.saleStatus !== 'on_shelf') {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          message: `product ${p.name} not on shelf`,
        });
      }
      const reqJin = (it.portions * p.estimatedWeightGrams) / 500;
      if (Number(p.stockJin) < reqJin) {
        throw new UnprocessableEntityException({
          code: 'GROCERY_OUT_OF_STOCK',
          message: `${p.name} stock not enough`,
        });
      }
    }

    const now = Date.now();
    const nowStr = String(now);
    let estimatedTotal = 0n;
    const itemRecords: GroceryOrderItem[] = [];

    for (const it of dto.items) {
      const p = prodMap.get(it.productId)!;
      const estGrams = it.portions * p.estimatedWeightGrams;
      const lineCents = (BigInt(p.unitPriceCentsPerJin) * BigInt(estGrams)) / 500n;
      estimatedTotal += lineCents;

      const item = this.itemRepo.create({
        productId: p.productId,
        productNameSnapshot: p.name,
        isWeighted: p.isWeighted,
        unitPriceCentsPerJin: p.unitPriceCentsPerJin,
        estimatedPerPortionGrams: p.estimatedWeightGrams,
        portions: it.portions,
        estimatedWeightGrams: estGrams,
        estimatedLineCents: lineCents.toString(),
        hasTraceability: p.hasTraceability,
        createdAt: nowStr,
        updatedAt: nowStr,
      });
      itemRecords.push(item);
    }

    const order = this.orderRepo.create({
      customerId,
      pickupPointId: pickup.pickupPointId,
      pickupPointSnapshot: {
        name: pickup.name,
        address: pickup.address,
        contactPhone: pickup.contactPhone,
      },
      status: 'wait_pay',
      estimatedAmountCents: estimatedTotal.toString(),
      remark: dto.remark ?? null,
      createdAt: nowStr,
      updatedAt: nowStr,
    });
    const savedOrder = await this.orderRepo.save(order);

    for (const it of itemRecords) {
      it.orderId = savedOrder.orderId;
    }
    await this.itemRepo.save(itemRecords);

    // 库存锁定:扣预估库存
    for (const it of dto.items) {
      const p = prodMap.get(it.productId)!;
      const reqJin = (it.portions * p.estimatedWeightGrams) / 500;
      const next = Number(p.stockJin) - reqJin;
      const saleStatus = next === 0 ? 'sold_out' : p.saleStatus;
      await this.prodRepo.update(
        { productId: p.productId },
        { stockJin: next.toFixed(2), saleStatus, updatedAt: nowStr },
      );
    }

    return { orderId: savedOrder.orderId, status: savedOrder.status, updatedAt: savedOrder.updatedAt };
  }

  async cancel(customerId: string, orderId: string, dto: CancelGroceryOrderDto): Promise<GroceryOrderMutationVo> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('not your order');
    if (!['wait_pay', 'paid'].includes(order.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `order cannot cancel in status=${order.status}`,
      });
    }

    const now = String(Date.now());
    order.status = 'cancelled';
    order.cancelledAt = now;
    order.cancelReason = dto.reason ?? '用户主动取消';
    order.updatedAt = now;
    await this.orderRepo.save(order);

    // 库存回滚
    await this.releaseStock(orderId, now);

    return { orderId: order.orderId, status: order.status, updatedAt: order.updatedAt };
  }

  async list(customerId: string, query: ListGroceryOrdersQueryDto): Promise<ListGroceryOrdersVo> {
    const pageNo = query.pageNo ?? 1;
    const pageSize = query.pageSize ?? 20;
    const qb = this.orderRepo.createQueryBuilder('o').where('o.customer_id = :cid', { cid: customerId });
    if (query.status) qb.andWhere('o.status = :st', { st: query.status });
    qb.orderBy('o.created_at', 'DESC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [orders, total] = await qb.getManyAndCount();
    const orderIds = orders.map((o) => o.orderId);
    const items = orderIds.length
      ? await this.itemRepo.createQueryBuilder('i').where('i.order_id IN (:...ids)', { ids: orderIds }).getMany()
      : [];
    const itemsByOrder = new Map<string, GroceryOrderItem[]>();
    for (const it of items) {
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }

    return {
      pageNo,
      pageSize,
      total,
      list: orders.map((o) => this.toVo(o, itemsByOrder.get(o.orderId) ?? [])),
    };
  }

  async detail(customerId: string, orderId: string): Promise<GroceryOrderVo> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.customerId !== customerId) throw new ForbiddenException('not your order');
    const items = await this.itemRepo.find({ where: { orderId } });
    return this.toVo(order, items);
  }

  /** 内部 — 释放预估库存(取消时调用) */
  async releaseStock(orderId: string, now: string): Promise<void> {
    const items = await this.itemRepo.find({ where: { orderId } });
    for (const it of items) {
      const p = await this.prodRepo.findOne({ where: { productId: it.productId } });
      if (!p) continue;
      const back = it.estimatedWeightGrams / 500;
      const next = Number(p.stockJin) + back;
      const saleStatus = p.saleStatus === 'sold_out' && next > 0 ? 'on_shelf' : p.saleStatus;
      await this.prodRepo.update({ productId: p.productId }, { stockJin: next.toFixed(2), saleStatus, updatedAt: now });
    }
  }

  /** 内部 — 标记已支付(payment-callback 后调用) */
  async markPaid(orderId: string, paymentOrderId: string): Promise<void> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) return;
    if (order.status !== 'wait_pay') return;
    const now = String(Date.now());
    order.status = 'paid';
    order.paidAt = now;
    order.estimatePaymentOrderId = paymentOrderId;
    order.updatedAt = now;
    await this.orderRepo.save(order);
  }

  private toVo(o: GroceryOrder, items: GroceryOrderItem[]): GroceryOrderVo {
    return plainToInstance(
      GroceryOrderVo,
      {
        orderId: o.orderId,
        customerId: o.customerId,
        pickupPointId: o.pickupPointId,
        pickupPointSnapshot: o.pickupPointSnapshot,
        status: o.status,
        estimatedAmountCents: o.estimatedAmountCents,
        finalAmountCents: o.finalAmountCents,
        weightDeltaCents: o.weightDeltaCents,
        estimatePaymentOrderId: o.estimatePaymentOrderId,
        deltaPaymentOrderId: o.deltaPaymentOrderId,
        deltaRefundOrderId: o.deltaRefundOrderId,
        pickupCode: o.pickupCode,
        paidAt: o.paidAt,
        pickingStartedAt: o.pickingStartedAt,
        weighSettledAt: o.weighSettledAt,
        pickupReadyAt: o.pickupReadyAt,
        pickedUpAt: o.pickedUpAt,
        cancelledAt: o.cancelledAt,
        cancelReason: o.cancelReason,
        remark: o.remark,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        items: items.map((it) =>
          plainToInstance(
            GroceryOrderItemVo,
            {
              itemId: it.itemId,
              productId: it.productId,
              productNameSnapshot: it.productNameSnapshot,
              unitPriceCentsPerJin: it.unitPriceCentsPerJin,
              estimatedPerPortionGrams: it.estimatedPerPortionGrams,
              portions: it.portions,
              estimatedWeightGrams: it.estimatedWeightGrams,
              estimatedLineCents: it.estimatedLineCents,
              finalWeightGrams: it.finalWeightGrams,
              finalLineCents: it.finalLineCents,
              hasTraceability: it.hasTraceability,
            },
            { excludeExtraneousValues: true },
          ),
        ),
      },
      { excludeExtraneousValues: true },
    );
  }
}
