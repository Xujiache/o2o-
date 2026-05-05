import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { FoodOrder, OrderTimeline, ProductSku, StockLock } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const MERCHANT_ACCEPT_TIMEOUT_MS = 10 * 60 * 1000;
const SCAN_LIMIT = 100;

/**
 * 商家 10 min 未接单 → 自动取消 + 退款 mock + 释放库存。
 * 真退款 stage 7+ 接退款流程,本阶段仅 log 记录 mock 退款事实。
 */
@Injectable()
export class MerchantAcceptTimeoutCancelJob extends BaseJob {
  readonly name = 'merchant-accept-timeout-cancel';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'merchant-accept-timeout-cancel' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const cutoff = now - MERCHANT_ACCEPT_TIMEOUT_MS;
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'PAID_WAIT_MERCHANT' AND o.paid_at < :cutoff", { cutoff })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!orders.length) {
      this.logger.debug('[merchant-accept-timeout-cancel] no overdue orders');
      return;
    }
    this.logger.warn(`[merchant-accept-timeout-cancel] processing ${orders.length} overdue orders (mock refund)`);

    for (const order of orders) {
      const released: Array<{ skuId: string; quantity: number }> = [];
      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          await em.getRepository(FoodOrder).update(
            { foodOrderId: order.foodOrderId },
            {
              status: 'CANCELLED',
              cancelledAt: String(now),
              cancelledBy: 'system',
              cancelledReason: 'MERCHANT_ACCEPT_TIMEOUT',
              updatedAt: String(now),
            },
          );
          // stage 5:商家未接单时 stock_lock 已 consumed(callback 阶段),需要按 quantity 复原 sku.stock
          const locks = await em
            .getRepository(StockLock)
            .find({ where: { orderId: order.foodOrderId, status: 'consumed' } });
          for (const lock of locks) {
            await em
              .getRepository(StockLock)
              .update({ stockLockId: lock.stockLockId }, { status: 'released', releasedAt: String(now) });
            await em.getRepository(ProductSku).increment({ skuId: lock.skuId }, 'stock', lock.quantity);
            released.push({ skuId: lock.skuId, quantity: lock.quantity });
          }
          await em.getRepository(OrderTimeline).insert({
            orderId: order.foodOrderId,
            bizType: 'FOOD',
            fromStatus: 'PAID_WAIT_MERCHANT',
            toStatus: 'CANCELLED',
            actorType: 'system',
            actorId: 'merchant-accept-timeout-cancel',
            reason: 'MERCHANT_ACCEPT_TIMEOUT',
            createdAt: String(now),
          });
        });

        await this.eventBus.publish(
          EventName.FoodOrderCancelled,
          {
            orderId: order.foodOrderId,
            customerId: order.customerId,
            reason: 'MERCHANT_ACCEPT_TIMEOUT',
            cancelledBy: 'system',
            cancelledAt: now,
          },
          { bizType: 'food-order', bizId: order.foodOrderId },
        );
        if (released.length) {
          await this.eventBus.publish(
            EventName.StockReleased,
            { orderId: order.foodOrderId, items: released, reason: 'MERCHANT_ACCEPT_TIMEOUT', releasedAt: now },
            { bizType: 'food-order', bizId: order.foodOrderId },
          );
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[merchant-accept-timeout-cancel] failed orderId=${order.foodOrderId}: ${msg}`);
      }
    }
  }
}
