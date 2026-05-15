import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { GroceryOrder, GroceryOrderItem, GroceryProduct } from '../../database/entities';

/**
 * 拣货 + 称重 + 多退少补服务(GR-4 核心)
 *
 * 状态流:
 *   paid → picking (startPicking)
 *   picking → picking (weighItem 逐项录入)
 *   picking → weigh_settled (settle 全部称完,计算差额)
 *   weigh_settled → pickup_ready (markReady 生成自提码)
 *   pickup_ready → picked_up (verifyPickup 扫码核销)
 *   picking → refunded (cancelForOOS 缺货全退)
 *
 * 差额计算:
 *   final_line_cents = unit_price_cents_per_jin × final_weight_grams / 500 (BigInt 精度)
 *   weight_delta_cents = final_total - estimated_total
 *   |delta| ≤ estimated × 0.30 (默认 30% 上限,超出抛 WEIGHT_DELTA_EXCEEDED)
 *
 * 当前 GR-4 简化:差额直接落 weight_delta_cents 字段,但不接 payment 模块自动生成补付/退款单
 * (payment 模块依赖复杂,在 GR-5/7 阶段对接);customer detail 页可看到差额。
 */
@Injectable()
export class PickingService {
  private readonly logger = new Logger(PickingService.name);

  /** 差额上限比例(超出转人工/取消) — 后续可从 sys_config 读 */
  private readonly DELTA_MAX_RATIO = 0.3;

  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    @InjectRepository(GroceryOrderItem) private readonly itemRepo: Repository<GroceryOrderItem>,
    @InjectRepository(GroceryProduct) private readonly prodRepo: Repository<GroceryProduct>,
  ) {}

  async startPicking(orderId: string): Promise<{ orderId: string; status: string; updatedAt: string }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'paid') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot start picking in status=${order.status}`,
      });
    }
    const now = String(Date.now());
    order.status = 'picking';
    order.pickingStartedAt = now;
    order.updatedAt = now;
    await this.orderRepo.save(order);
    return { orderId: order.orderId, status: order.status, updatedAt: order.updatedAt };
  }

  async weighItem(
    orderId: string,
    itemId: string,
    finalWeightGrams: number,
    boundQrcodeIds?: string[],
  ): Promise<{ itemId: string; finalLineCents: string; allWeighed: boolean }> {
    if (!Number.isInteger(finalWeightGrams) || finalWeightGrams <= 0) {
      throw new UnprocessableEntityException({
        code: ErrorCode.INVALID_PARAM,
        message: 'finalWeightGrams must be positive integer',
      });
    }
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'picking') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot weigh in status=${order.status}`,
      });
    }
    const item = await this.itemRepo.findOne({ where: { itemId, orderId } });
    if (!item) throw new NotFoundException('item not found');

    const finalLineCents = (BigInt(item.unitPriceCentsPerJin) * BigInt(finalWeightGrams)) / 500n;
    const now = String(Date.now());
    item.finalWeightGrams = finalWeightGrams;
    item.finalLineCents = finalLineCents.toString();
    if (boundQrcodeIds && boundQrcodeIds.length > 0) {
      item.boundQrcodeIds = boundQrcodeIds;
    }
    item.updatedAt = now;
    await this.itemRepo.save(item);

    const allItems = await this.itemRepo.find({ where: { orderId } });
    const allWeighed = allItems.every((it) => it.finalWeightGrams !== null && it.finalWeightGrams !== undefined);

    return { itemId: item.itemId, finalLineCents: item.finalLineCents, allWeighed };
  }

  async settle(orderId: string): Promise<{
    orderId: string;
    estimatedAmountCents: string;
    finalAmountCents: string;
    weightDeltaCents: string;
    status: string;
  }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'picking') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot settle in status=${order.status}`,
      });
    }

    const items = await this.itemRepo.find({ where: { orderId } });
    for (const it of items) {
      if (it.finalWeightGrams === null || it.finalWeightGrams === undefined) {
        throw new UnprocessableEntityException({
          code: 'WEIGH_INCOMPLETE',
          message: `item ${it.itemId} not weighed yet`,
        });
      }
    }

    let finalTotal = 0n;
    for (const it of items) {
      finalTotal += BigInt(it.finalLineCents ?? '0');
    }
    const estimated = BigInt(order.estimatedAmountCents);
    const delta = finalTotal - estimated;
    const maxAbs = (estimated * BigInt(Math.round(this.DELTA_MAX_RATIO * 1000))) / 1000n;
    const absDelta = delta < 0n ? -delta : delta;
    if (absDelta > maxAbs) {
      throw new UnprocessableEntityException({
        code: 'WEIGHT_DELTA_EXCEEDED',
        message: `delta ${delta} > max ${maxAbs}`,
      });
    }

    const now = String(Date.now());
    order.finalAmountCents = finalTotal.toString();
    order.weightDeltaCents = delta.toString();
    order.status = 'weigh_settled';
    order.weighSettledAt = now;
    order.updatedAt = now;
    await this.orderRepo.save(order);

    // 库存调整:实际重量 vs 预估重量的差额回滚/扣减
    for (const it of items) {
      const p = await this.prodRepo.findOne({ where: { productId: it.productId } });
      if (!p) continue;
      const estJin = it.estimatedWeightGrams / 500;
      const finalJin = (it.finalWeightGrams ?? 0) / 500;
      // 之前 submit 时已扣 estimated,这里调整为 final:回补 (est - final) 斤
      const adjust = estJin - finalJin;
      if (adjust !== 0) {
        const next = Number(p.stockJin) + adjust;
        if (next >= 0) {
          await this.prodRepo.update({ productId: p.productId }, { stockJin: next.toFixed(2), updatedAt: now });
        }
      }
    }

    return {
      orderId: order.orderId,
      estimatedAmountCents: order.estimatedAmountCents,
      finalAmountCents: order.finalAmountCents,
      weightDeltaCents: order.weightDeltaCents,
      status: order.status,
    };
  }

  async markReady(orderId: string): Promise<{ orderId: string; status: string; pickupCode: string }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'weigh_settled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot mark ready in status=${order.status}`,
      });
    }
    // GR-4 简化:不阻塞补付完成(payment 模块对接在 GR-7);直接生成自提码
    const pickupCode = String(Math.floor(100000 + Math.random() * 900000));
    const now = String(Date.now());
    order.status = 'pickup_ready';
    order.pickupCode = pickupCode;
    order.pickupReadyAt = now;
    order.updatedAt = now;
    await this.orderRepo.save(order);
    return { orderId: order.orderId, status: order.status, pickupCode };
  }

  async verifyPickup(orderId: string, code: string): Promise<{ orderId: string; status: string }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (order.status !== 'pickup_ready') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot verify pickup in status=${order.status}`,
      });
    }
    if (!order.pickupCode || order.pickupCode !== code.trim()) {
      throw new UnprocessableEntityException({
        code: 'PICKUP_CODE_INVALID',
        message: 'pickup code wrong',
      });
    }
    const now = String(Date.now());
    order.status = 'picked_up';
    order.pickedUpAt = now;
    order.updatedAt = now;
    await this.orderRepo.save(order);
    return { orderId: order.orderId, status: order.status };
  }

  async cancelForOOS(orderId: string, reason: string): Promise<{ orderId: string; status: string }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    if (!['paid', 'picking'].includes(order.status)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `cannot cancel-OOS in status=${order.status}`,
      });
    }
    const now = String(Date.now());
    order.status = 'refunded';
    order.cancelledAt = now;
    order.cancelReason = reason;
    order.updatedAt = now;
    await this.orderRepo.save(order);
    // 库存回滚
    const items = await this.itemRepo.find({ where: { orderId } });
    for (const it of items) {
      const p = await this.prodRepo.findOne({ where: { productId: it.productId } });
      if (!p) continue;
      const back = it.estimatedWeightGrams / 500;
      const next = Number(p.stockJin) + back;
      await this.prodRepo.update({ productId: p.productId }, { stockJin: next.toFixed(2), updatedAt: now });
    }
    return { orderId: order.orderId, status: order.status };
  }

  /** 运营员查看拣货池(状态筛选) */
  async listForPicking(
    status: string | undefined,
    pageNo = 1,
    pageSize = 20,
  ): Promise<{
    pageNo: number;
    pageSize: number;
    total: number;
    list: Array<{
      orderId: string;
      status: string;
      estimatedAmountCents: string;
      finalAmountCents: string | null;
      weightDeltaCents: string | null;
      pickupCode: string | null;
      pickupPointId: string;
      pickupPointName: string;
      createdAt: string;
      itemCount: number;
    }>;
  }> {
    const qb = this.orderRepo.createQueryBuilder('o');
    if (status) {
      qb.where('o.status = :st', { st: status });
    } else {
      qb.where('o.status IN (:...sts)', {
        sts: ['paid', 'picking', 'weigh_settled', 'pickup_ready'],
      });
    }
    qb.orderBy('o.created_at', 'ASC')
      .skip((pageNo - 1) * pageSize)
      .take(pageSize);
    const [orders, total] = await qb.getManyAndCount();
    const orderIds = orders.map((o) => o.orderId);
    const itemCounts = new Map<string, number>();
    if (orderIds.length) {
      const rows = await this.itemRepo
        .createQueryBuilder('i')
        .select('i.order_id', 'orderId')
        .addSelect('COUNT(i.item_id)', 'cnt')
        .where('i.order_id IN (:...ids)', { ids: orderIds })
        .groupBy('i.order_id')
        .getRawMany<{ orderId: string; cnt: string }>();
      for (const r of rows) itemCounts.set(r.orderId, Number(r.cnt));
    }
    return {
      pageNo,
      pageSize,
      total,
      list: orders.map((o) => ({
        orderId: o.orderId,
        status: o.status,
        estimatedAmountCents: o.estimatedAmountCents,
        finalAmountCents: o.finalAmountCents,
        weightDeltaCents: o.weightDeltaCents,
        pickupCode: o.pickupCode,
        pickupPointId: o.pickupPointId,
        pickupPointName: (o.pickupPointSnapshot as { name?: string } | null | undefined)?.name ?? '',
        createdAt: o.createdAt,
        itemCount: itemCounts.get(o.orderId) ?? 0,
      })),
    };
  }

  async pickingDetail(orderId: string): Promise<{
    order: GroceryOrder;
    items: GroceryOrderItem[];
  }> {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException('order not found');
    const items = await this.itemRepo.find({ where: { orderId }, order: { itemId: 'ASC' } });
    return { order, items };
  }
}
