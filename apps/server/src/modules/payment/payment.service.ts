import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import {
  ErrandOrder,
  ErrandTimeline,
  FoodOrder,
  OrderTimeline,
  PaymentOrder,
  ProductSku,
  StockLock,
  StockRecord,
} from '../../database/entities';
import type { PaymentOrderBizType, PaymentOrderChannel } from '../../database/entities/payment-order.entity';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { CouponService } from '../coupon/coupon.service';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { type CustomerPaymentVo, type PrepayDto, type PrepayVo } from './payment.dto';

const NONCE_PREFIX = 'pay:cb:nonce:';
const NONCE_TTL_SECONDS = 60;

export interface CallbackResult {
  ok: true;
  duplicate?: boolean;
}

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(PaymentOrder) private readonly payRepo: Repository<PaymentOrder>,
    @InjectRepository(ErrandOrder) private readonly errandOrderRepo: Repository<ErrandOrder>,
    private readonly gateway: IntegrationGatewayService,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly couponService: CouponService,
  ) {}

  async getForCustomer(customerId: string, payOrderId: string): Promise<CustomerPaymentVo> {
    const p = await this.payRepo.findOne({ where: { paymentOrderId: payOrderId } });
    if (!p) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'pay order not found' });
    }
    // 越权检查:校验该 bizId 订单归属本 customer
    if (p.bizType === 'FOOD') {
      const o = await this.orderRepo.findOne({ where: { foodOrderId: p.bizId } });
      if (!o || o.customerId !== customerId) {
        throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your payment' });
      }
    } else {
      const e = await this.errandOrderRepo.findOne({ where: { errandOrderId: p.bizId } });
      if (!e || e.customerId !== customerId) {
        throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'not your payment' });
      }
    }
    return {
      payOrderId: p.paymentOrderId,
      payStatus: p.status,
      paidAt: p.paidAt ? Number(p.paidAt) : null,
      amountFen: p.paidAmount ?? p.payableAmount,
      channel: p.payChannel,
    };
  }

  async prepay(customerId: string, dto: PrepayDto): Promise<PrepayVo> {
    // 1. 校验订单(本人 + WAIT_PAY)— 按 bizType 路由到不同订单表
    const orderInfo = await this.fetchOrderForPrepay(dto.bizType, dto.orderId, customerId);

    // 2. 复用同 channel 未过期 pending 支付单(idempotent on retries)
    const existing = await this.payRepo.findOne({
      where: {
        bizType: dto.bizType,
        bizId: dto.orderId,
        payChannel: dto.payChannel,
        status: 'pending',
      },
    });
    let paymentOrder: PaymentOrder;
    if (existing && Number(existing.expireAt) > Date.now()) {
      paymentOrder = existing;
    } else {
      const now = Date.now();
      const payOrderNo = this.generatePayOrderNo();
      const ins = await this.payRepo.insert({
        payOrderNo,
        bizType: dto.bizType,
        bizId: dto.orderId,
        payChannel: dto.payChannel,
        payableAmount: orderInfo.payableAmount,
        status: 'pending',
        retryCount: 0,
        expireAt: orderInfo.expireAt,
        createdAt: String(now),
        updatedAt: String(now),
      });
      const payId = String(ins.identifiers[0]?.paymentOrderId ?? '');
      paymentOrder = (await this.payRepo.findOne({ where: { paymentOrderId: payId } }))!;
    }

    // 3. 调适配器创建 prepay
    const notifyBase = process.env.GATEWAY_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000';
    const notifyUrl = `${notifyBase}/api/v1/callback/${dto.payChannel}`;
    const payParams = await this.callAdapter(dto.payChannel, {
      outTradeNo: paymentOrder.payOrderNo,
      amountCents: Number(paymentOrder.payableAmount),
      description: `${dto.bizType.toLowerCase()} order ${dto.orderId}`,
      notifyUrl,
    });

    return {
      payOrderId: paymentOrder.paymentOrderId,
      payOrderNo: paymentOrder.payOrderNo,
      payParams,
      expireAt: Number(paymentOrder.expireAt),
    };
  }

  private async fetchOrderForPrepay(
    bizType: PaymentOrderBizType,
    orderId: string,
    customerId: string,
  ): Promise<{ payableAmount: string; expireAt: string }> {
    if (bizType === 'FOOD') {
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
          detail: 'ORDER_NOT_PAYABLE',
          message: '当前订单状态无法支付',
        });
      }
      if (Number(order.expireAt) < Date.now()) {
        throw new UnprocessableEntityException({
          code: ErrorCode.STATUS_INVALID,
          detail: 'ORDER_EXPIRED',
          message: '订单已超时',
        });
      }
      return { payableAmount: order.payableAmount, expireAt: order.expireAt };
    }
    // ERRAND
    const errand = await this.errandOrderRepo.findOne({ where: { errandOrderId: orderId } });
    if (!errand || errand.customerId !== customerId) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    if (errand.status !== 'WAIT_PAY') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'ORDER_NOT_PAYABLE',
        message: '当前订单状态无法支付',
      });
    }
    if (Number(errand.expireAt) < Date.now()) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'ORDER_EXPIRED',
        message: '订单已超时',
      });
    }
    return { payableAmount: errand.payableAmount, expireAt: errand.expireAt };
  }

  private async callAdapter(
    channel: PaymentOrderChannel,
    input: { outTradeNo: string; amountCents: number; description: string; notifyUrl: string },
  ): Promise<string> {
    if (channel === 'wxpay') {
      const r = await this.gateway.wxpay.createPrepay(input);
      return r.payParams;
    }
    const r = await this.gateway.alipay.createPrepay(input);
    return r.payParams;
  }

  private generatePayOrderNo(): string {
    const d = new Date();
    const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    const rand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    return `P${ts}${rand}`;
  }

  /**
   * 处理 wxpay/alipay 异步回调
   * - 验签 + nonce 防重放
   * - 事务:更新 payment_order + food_order(WAIT_PAY → PAID_WAIT_MERCHANT)+ stock_lock consumed + sku.stock 减 + stock_record + timeline
   * - 发 PaymentSucceeded + FoodOrderPaid 事件
   * - 重复回调返 duplicate(不重复发事件)
   */
  async handleCallback(channel: PaymentOrderChannel, rawBody: string, sign: string): Promise<CallbackResult> {
    // 1. 验签 + 解析
    const adapter = channel === 'wxpay' ? this.gateway.wxpay : this.gateway.alipay;
    const parsed = adapter.parseCallback(rawBody, sign);
    if (!parsed) {
      throw new UnprocessableEntityException({
        code: ErrorCode.THIRD_PARTY_ERROR,
        detail: 'CALLBACK_VERIFY_FAILED',
        message: '回调验签失败',
      });
    }

    // 2. nonce 防重放(SETNX)
    const nonceKey = `${NONCE_PREFIX}${channel}:${parsed.outTradeNo}:${parsed.channelTradeNo}`;
    const setOk = await this.redis.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX').catch(() => null);
    if (setOk === null) {
      // SET NX 失败 = 短时间内重放(无 ack 必要,但仍幂等响应)
      return { ok: true, duplicate: true };
    }

    // 3. 查 payment_order
    const payment = await this.payRepo.findOne({ where: { payOrderNo: parsed.outTradeNo } });
    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'PAY_ORDER_NOT_FOUND',
        message: '支付单不存在',
      });
    }
    if (payment.status === 'success') {
      return { ok: true, duplicate: true };
    }
    if (payment.status !== 'pending') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PAY_ORDER_NOT_PENDING',
        message: '支付单状态异常',
      });
    }

    // 金额一致性校验:通道实际收款必须 === 应付金额。
    // 缺失这一步即等于"任何金额都算支付成功",资金对账会失败。
    if (BigInt(parsed.paidAmountCents) !== BigInt(payment.payableAmount)) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        detail: 'PAID_AMOUNT_MISMATCH',
        message: `支付金额异常 expected=${payment.payableAmount} actual=${parsed.paidAmountCents}`,
      });
    }

    // 4. 事务
    const now = parsed.paidAt;
    await this.dataSource.transaction(async (em: EntityManager) => {
      // payment_order success
      await em.getRepository(PaymentOrder).update(
        { paymentOrderId: payment.paymentOrderId },
        {
          status: 'success',
          paidAmount: String(parsed.paidAmountCents),
          channelTradeNo: parsed.channelTradeNo,
          paidAt: String(now),
          updatedAt: String(now),
          callbackRaw: { rawBody: parsed.raw, parsedAt: now, channelTradeNo: parsed.channelTradeNo },
        },
      );

      if (payment.bizType === 'FOOD') {
        await this.applyFoodPaid(em, payment, parsed.paidAmountCents, now, channel);
      } else {
        await this.applyErrandPaid(em, payment, parsed.paidAmountCents, now);
      }
    });

    // 5. 发事件
    await this.eventBus.publish(
      EventName.PaymentSucceeded,
      {
        payOrderId: payment.paymentOrderId,
        payOrderNo: payment.payOrderNo,
        bizType: payment.bizType,
        bizId: payment.bizId,
        payChannel: channel,
        paidAmount: String(parsed.paidAmountCents),
        paidAt: now,
      },
      { bizType: 'payment', bizId: payment.paymentOrderId },
    );

    if (payment.bizType === 'FOOD') {
      const order = await this.orderRepo.findOne({ where: { foodOrderId: payment.bizId } });
      if (order && order.status === 'PAID_WAIT_MERCHANT') {
        await this.eventBus.publish(
          EventName.FoodOrderPaid,
          {
            orderId: payment.bizId,
            customerId: order.customerId,
            storeId: order.storeId,
            paidAmount: String(parsed.paidAmountCents),
            paidAt: now,
          },
          { bizType: 'food-order', bizId: payment.bizId },
        );
      }
    } else {
      const errand = await this.errandOrderRepo.findOne({ where: { errandOrderId: payment.bizId } });
      if (errand && errand.status === 'PAID') {
        await this.eventBus.publish(
          EventName.ErrandPaid,
          {
            orderId: payment.bizId,
            customerId: errand.customerId,
            paidAmount: String(parsed.paidAmountCents),
            paidAt: now,
          },
          { bizType: 'errand-order', bizId: payment.bizId },
        );
      }
    }

    return { ok: true };
  }

  private async applyFoodPaid(
    em: EntityManager,
    payment: PaymentOrder,
    paidAmountCents: number,
    now: number,
    channel: PaymentOrderChannel,
  ): Promise<void> {
    // food_order WAIT_PAY → PAID_WAIT_MERCHANT
    const order = await em.getRepository(FoodOrder).findOne({ where: { foodOrderId: payment.bizId } });
    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ORDER_NOT_FOUND',
        message: '订单不存在',
      });
    }
    if (order.status !== 'WAIT_PAY') {
      // 已被 15min job 提前关单 — 不应继续推进,但 payment 已 success,记录事实即可
      return;
    }
    await em.getRepository(FoodOrder).update(
      { foodOrderId: payment.bizId },
      {
        status: 'PAID_WAIT_MERCHANT',
        payStatus: 'paid',
        paidAt: String(now),
        paidAmount: String(paidAmountCents),
        updatedAt: String(now),
      },
    );
    // stock_lock active → consumed + sku.stock -= q + sku.stock_locked -= q + stock_record
    const locks = await em.getRepository(StockLock).find({ where: { orderId: payment.bizId, status: 'active' } });
    for (const lock of locks) {
      await em
        .getRepository(StockLock)
        .update({ stockLockId: lock.stockLockId }, { status: 'consumed', releasedAt: String(now) });
      await em.getRepository(ProductSku).decrement({ skuId: lock.skuId }, 'stock', lock.quantity);
      await em.getRepository(ProductSku).decrement({ skuId: lock.skuId }, 'stockLocked', lock.quantity);
      const sku = await em.getRepository(ProductSku).findOne({ where: { skuId: lock.skuId } });
      await em.getRepository(StockRecord).insert({
        productId: String(sku?.productId ?? '0'),
        skuId: lock.skuId,
        quantityChange: -lock.quantity,
        reason: 'ORDER_PAID',
        operatorId: 'system',
        operatorType: 'system',
        stockBefore: (sku?.stock ?? 0) + lock.quantity,
        stockAfter: sku?.stock ?? 0,
        createdAt: String(now),
      });
    }
    // 优惠券 active → consumed(若该订单有锁则核销;无锁返 0,幂等)
    await this.couponService.consumeCoupons(em, payment.bizId);

    await em.getRepository(OrderTimeline).insert({
      orderId: payment.bizId,
      bizType: 'FOOD',
      fromStatus: 'WAIT_PAY',
      toStatus: 'PAID_WAIT_MERCHANT',
      actorType: 'system',
      actorId: 'callback',
      reason: `${channel} callback`,
      createdAt: String(now),
    });
  }

  private async applyErrandPaid(
    em: EntityManager,
    payment: PaymentOrder,
    paidAmountCents: number,
    now: number,
  ): Promise<void> {
    const errand = await em.getRepository(ErrandOrder).findOne({ where: { errandOrderId: payment.bizId } });
    if (!errand) {
      throw new NotFoundException({
        code: ErrorCode.DATA_NOT_FOUND,
        detail: 'ERRAND_ORDER_NOT_FOUND',
        message: '跑腿订单不存在',
      });
    }
    if (errand.status !== 'WAIT_PAY') {
      // 已被 15min job 关单 — payment 已 success,不再推进,直接返
      return;
    }
    await em.getRepository(ErrandOrder).update(
      { errandOrderId: payment.bizId },
      {
        status: 'PAID',
        payStatus: 'paid',
        paidAmount: String(paidAmountCents),
        paidAt: String(now),
        updatedAt: String(now),
      },
    );
    await em.getRepository(ErrandTimeline).insert({
      errandOrderId: payment.bizId,
      eventType: 'PAID',
      payload: { paidAmount: paidAmountCents, payOrderId: payment.paymentOrderId },
      operator: 'system',
      createdAt: String(now),
    });
  }
}
