import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { GroceryOrder, GroceryOrderItem, GroceryProduct, PaymentOrder } from '../../database/entities';
import { AdminRefundService } from '../admin-refund/admin-refund.service';

/**
 * 拣货 + 称重 + 多退少补服务(GR-4 核心,GR-7+ 接通真金流)
 *
 * 状态流:
 *   paid → picking (startPicking,SKU/piece 商品自动 finalize)
 *   picking → picking (weighItem 逐项录入,仅 is_weighted=1 的项需要)
 *   picking → weigh_settled (settle 全部称完,计算差额并自动创建补付/退款单)
 *   weigh_settled → pickup_ready (markReady 校验补付完成,生成自提码)
 *   pickup_ready → picked_up (verifyPickup 扫码核销)
 *   picking → refunded (cancelForOOS 缺货全退)
 *
 * 多退少补真金流(GR-7+ 闭环):
 *   - delta > 0(补付):settle 时创建 pending PaymentOrder 写入 order.deltaPaymentOrderId;
 *                     customer 端走 /c/payments/prepay {bizType:GROCERY,orderId} 复用该 pending 单;
 *                     callback 时通过 payment.service.applyGroceryPaid 识别为补付单(不改 status)。
 *   - delta < 0(退款):settle 时通过 AdminRefundService 立即创建并 mock 执行 SUCCESS,写入 order.deltaRefundOrderId。
 *   - markReady 拒绝条件:delta > 0 且补付单 status != 'success'。
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
    @InjectRepository(PaymentOrder) private readonly paymentRepo: Repository<PaymentOrder>,
    private readonly adminRefund: AdminRefundService,
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

    // SKU/piece 商品下单即定价,startPicking 时自动 finalize 这些 items(运营员只需称 weight 商品)
    const items = await this.itemRepo.find({ where: { orderId } });
    for (const it of items) {
      if (it.isWeighted === 0 && (it.finalWeightGrams === null || it.finalWeightGrams === undefined)) {
        it.finalWeightGrams = it.estimatedWeightGrams;
        it.finalLineCents = it.estimatedLineCents;
        it.updatedAt = now;
        await this.itemRepo.save(it);
      }
    }

    order.status = 'picking';
    order.pickingStartedAt = now;
    order.updatedAt = now;
    await this.orderRepo.save(order);
    return { orderId: order.orderId, status: order.status, updatedAt: order.updatedAt };
  }

  async weighItem(
    orderId: string,
    itemId: string,
    finalWeightGrams: number | undefined,
    boundQrcodeIds?: string[],
  ): Promise<{ itemId: string; finalLineCents: string; allWeighed: boolean }> {
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

    const now = String(Date.now());
    if (item.isWeighted === 1) {
      if (!Number.isInteger(finalWeightGrams) || (finalWeightGrams as number) <= 0) {
        throw new UnprocessableEntityException({
          code: ErrorCode.INVALID_PARAM,
          message: 'finalWeightGrams must be positive integer for weighted item',
        });
      }
      const w = finalWeightGrams as number;
      const finalLineCents = (BigInt(item.unitPriceCentsPerJin) * BigInt(w)) / 500n;
      item.finalWeightGrams = w;
      item.finalLineCents = finalLineCents.toString();
    }
    // SKU/按件 商品的 finalLineCents 已在 startPicking 自动结算,此处仅维护 boundQrcodeIds。
    if (boundQrcodeIds && boundQrcodeIds.length > 0) {
      item.boundQrcodeIds = boundQrcodeIds;
    }
    item.updatedAt = now;
    await this.itemRepo.save(item);

    const allItems = await this.itemRepo.find({ where: { orderId } });
    const allWeighed = allItems.every((it) => it.finalWeightGrams !== null && it.finalWeightGrams !== undefined);

    return { itemId: item.itemId, finalLineCents: item.finalLineCents ?? '0', allWeighed };
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

    // 库存调整:仅对 is_weighted=1 的项做实重 vs 预估差额回补/扣减
    for (const it of items) {
      if (it.isWeighted === 0) continue;
      const p = await this.prodRepo.findOne({ where: { productId: it.productId } });
      if (!p) continue;
      const estJin = it.estimatedWeightGrams / 500;
      const finalJin = (it.finalWeightGrams ?? 0) / 500;
      const adjust = estJin - finalJin;
      if (adjust !== 0) {
        const next = Number(p.stockJin) + adjust;
        if (next >= 0) {
          await this.prodRepo.update({ productId: p.productId }, { stockJin: next.toFixed(2), updatedAt: now });
        }
      }
    }

    // ============ 多退少补真金流 ============
    if (delta > 0n) {
      // 补付:创建 pending PaymentOrder 等用户支付
      const expireAt = String(Date.now() + 24 * 3600 * 1000);
      const payOrderNo = this.generatePayOrderNo();
      const ins = await this.paymentRepo.insert({
        payOrderNo,
        bizType: 'GROCERY',
        bizId: order.orderId,
        payChannel: 'wxpay',
        payableAmount: delta.toString(),
        status: 'pending',
        retryCount: 0,
        expireAt,
        createdAt: now,
        updatedAt: now,
      });
      const payId = String(ins.identifiers[0]?.paymentOrderId ?? '');
      order.deltaPaymentOrderId = payId;
      this.logger.log(`[settle] order=${orderId} delta=+${delta} 创建补付单 payId=${payId}`);
    } else if (delta < 0n) {
      // 退款:立即调 admin-refund 创建并 mock 执行 SUCCESS
      const absAmount = (-delta).toString();
      try {
        const refund = await this.adminRefund.createFromArbitration({
          bizType: 'GROCERY',
          bizOrderId: order.orderId,
          paymentOrderId: order.estimatePaymentOrderId,
          amount: absAmount,
          provider: 'wxpay',
        });
        order.deltaRefundOrderId = refund.refundOrderId;
        this.logger.log(
          `[settle] order=${orderId} delta=${delta} 退款 ${absAmount} 已执行 refundId=${refund.refundOrderId}`,
        );
      } catch (err) {
        this.logger.error(`[settle] order=${orderId} 退款创建失败: ${(err as Error).message}`);
        throw err;
      }
    } else {
      this.logger.log(`[settle] order=${orderId} delta=0,无补付/退款`);
    }

    order.updatedAt = String(Date.now());
    await this.orderRepo.save(order);

    return {
      orderId: order.orderId,
      estimatedAmountCents: order.estimatedAmountCents,
      finalAmountCents: order.finalAmountCents,
      weightDeltaCents: order.weightDeltaCents,
      status: order.status,
    };
  }

  private generatePayOrderNo(): string {
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    return `P${ts}${rand}`;
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
    // GR-7+: 阻塞补付未完成的订单
    if (order.deltaPaymentOrderId) {
      const delta = await this.paymentRepo.findOne({ where: { paymentOrderId: order.deltaPaymentOrderId } });
      if (!delta || delta.status !== 'success') {
        throw new UnprocessableEntityException({
          code: 'DELTA_NOT_PAID',
          message: `差额补付未完成 (payOrderId=${order.deltaPaymentOrderId}),无法装箱`,
        });
      }
    }
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
