import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FoodOrder, Store } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const MERCHANT_REMIND_MS = 5 * 60 * 1000;
const MERCHANT_TIMEOUT_MS = 10 * 60 * 1000;
const SCAN_LIMIT = 200;

/**
 * Stage 7 — 商家 5min 未接单提醒(每 30 秒扫描一次)。
 * 仅推送提醒,不修改订单状态;10min 自动取消由 stage 5 MerchantAcceptTimeoutCancelJob 处理。
 * 重复提醒由 redis 标记防止(每个订单最多提醒一次)。
 */
@Injectable()
export class MerchantAcceptRemindJob extends BaseJob {
  readonly name = 'merchant-accept-remind';
  protected override lockTtlMs = 30_000;
  private readonly remindedOrders = new Set<string>();

  constructor(
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'merchant-accept-remind' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const remindBefore = now - MERCHANT_REMIND_MS;
    const cancelCutoff = now - MERCHANT_TIMEOUT_MS;

    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'PAID_WAIT_MERCHANT' AND o.paid_at < :remindBefore AND o.paid_at >= :cancelCutoff", {
        remindBefore,
        cancelCutoff,
      })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!orders.length) return;

    for (const order of orders) {
      if (this.remindedOrders.has(order.foodOrderId)) continue;
      this.remindedOrders.add(order.foodOrderId);

      const store = await this.storeRepo.findOne({ where: { storeId: order.storeId } });
      if (!store) continue;

      try {
        await this.eventBus.publish(
          EventName.MerchantOrderPushed,
          {
            orderId: order.foodOrderId,
            storeId: order.storeId,
            merchantId: store.merchantId,
            payableAmountCents: order.payableAmount,
            pushedAt: now,
          },
          { bizType: 'food-order', bizId: order.foodOrderId },
        );
        this.logger.log(`[merchant-accept-remind] reminded merchant ${store.merchantId} of order ${order.foodOrderId}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[merchant-accept-remind] failed orderId=${order.foodOrderId}: ${msg}`);
      }
    }
  }
}
