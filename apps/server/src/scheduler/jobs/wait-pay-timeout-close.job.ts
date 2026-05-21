import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { FoodOrder, OrderTimeline, PaymentOrder, ProductSku, RefundOrder, StockLock } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { CouponService } from '../../modules/coupon/coupon.service';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_LIMIT = 100;

/**
 * 15 min 未支付订单自动关单 + 释放库存。
 * Cron 每 30 秒一次。
 */
@Injectable()
export class WaitPayTimeoutCloseJob extends BaseJob {
  readonly name = 'wait-pay-timeout-close';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    private readonly couponService: CouponService,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'wait-pay-timeout-close' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'WAIT_PAY' AND o.expire_at < :now", { now })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!orders.length) {
      this.logger.debug('[wait-pay-timeout-close] no expired orders');
      return;
    }
    this.logger.log(`[wait-pay-timeout-close] processing ${orders.length} expired orders`);

    for (const order of orders) {
      const released: Array<{ skuId: string; quantity: number }> = [];
      let refundEmit: {
        refundOrderId: string;
        refundNo: string;
        amount: string;
      } | null = null;
      try {
        // 检测 race:status=WAIT_PAY 但已有 PaymentOrder.success(回调比 cron 慢)→ 需触发退款
        const paidPayment = await this.dataSource
          .getRepository(PaymentOrder)
          .findOne({ where: { bizType: 'FOOD', bizId: order.foodOrderId, status: 'success' } });

        await this.dataSource.transaction(async (em: EntityManager) => {
          await em.getRepository(FoodOrder).update(
            { foodOrderId: order.foodOrderId },
            {
              status: 'CANCELLED',
              cancelledAt: String(now),
              cancelledBy: 'system',
              cancelledReason: 'WAIT_PAY_TIMEOUT',
              updatedAt: String(now),
            },
          );
          const locks = await em
            .getRepository(StockLock)
            .find({ where: { orderId: order.foodOrderId, status: 'active' } });
          for (const lock of locks) {
            await em
              .getRepository(StockLock)
              .update({ stockLockId: lock.stockLockId }, { status: 'released', releasedAt: String(now) });
            await em.getRepository(ProductSku).decrement({ skuId: lock.skuId }, 'stockLocked', lock.quantity);
            released.push({ skuId: lock.skuId, quantity: lock.quantity });
          }
          // 释放优惠券(user_coupon USED → UNUSED;coupon_lock active → released)
          await this.couponService.releaseCoupons(em, order.foodOrderId);

          await em.getRepository(OrderTimeline).insert({
            orderId: order.foodOrderId,
            bizType: 'FOOD',
            fromStatus: 'WAIT_PAY',
            toStatus: 'CANCELLED',
            actorType: 'system',
            actorId: 'wait-pay-timeout-close',
            reason: 'WAIT_PAY_TIMEOUT',
            createdAt: String(now),
          });

          if (paidPayment) {
            const amount = paidPayment.paidAmount ?? paidPayment.payableAmount;
            const refundNo = `R${now}${String(order.foodOrderId).padStart(8, '0').slice(-8)}`;
            const insertRes = await em.getRepository(RefundOrder).insert({
              refundNo,
              bizType: 'FOOD',
              bizOrderId: order.foodOrderId,
              paymentOrderId: paidPayment.paymentOrderId,
              amount,
              status: 'SUCCESS',
              provider: paidPayment.payChannel,
              providerRefundId: `mock_${refundNo}`,
              errorMessage: null,
              createdAt: String(now),
              updatedAt: String(now),
            });
            await em
              .getRepository(PaymentOrder)
              .update({ paymentOrderId: paidPayment.paymentOrderId }, { status: 'refunded', updatedAt: String(now) });
            await em
              .getRepository(FoodOrder)
              .update({ foodOrderId: order.foodOrderId }, { payStatus: 'refunded', updatedAt: String(now) });
            refundEmit = {
              refundOrderId: String(insertRes.identifiers[0]?.refundOrderId ?? ''),
              refundNo,
              amount,
            };
          }
        });

        await this.eventBus.publish(
          EventName.FoodOrderCancelled,
          {
            orderId: order.foodOrderId,
            customerId: order.customerId,
            reason: 'WAIT_PAY_TIMEOUT',
            cancelledBy: 'system',
            cancelledAt: now,
          },
          { bizType: 'food-order', bizId: order.foodOrderId },
        );
        if (released.length) {
          await this.eventBus.publish(
            EventName.StockReleased,
            { orderId: order.foodOrderId, items: released, reason: 'WAIT_PAY_TIMEOUT', releasedAt: now },
            { bizType: 'food-order', bizId: order.foodOrderId },
          );
        }
        if (refundEmit) {
          const rf = refundEmit as { refundOrderId: string; refundNo: string; amount: string };
          await this.eventBus.publish(
            EventName.RefundExecuted,
            {
              refundOrderId: rf.refundOrderId,
              refundNo: rf.refundNo,
              bizType: 'FOOD',
              bizOrderId: order.foodOrderId,
              amount: rf.amount,
              status: 'SUCCESS' as const,
              executedAt: now,
            },
            { bizType: 'refund', bizId: rf.refundOrderId },
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[wait-pay-timeout-close] failed orderId=${order.foodOrderId}: ${msg}`);
      }
    }
  }
}
