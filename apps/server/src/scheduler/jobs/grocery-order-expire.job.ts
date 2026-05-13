import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { GroceryOrder, GroceryOrderItem, PickupTimeSlot, Product } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_LIMIT = 200;

/**
 * 生鲜订单 WAIT_PAY 15 分钟未支付 → 自动取消 + 回滚库存 + 释放时段
 * 与 grocery-order.service.releaseAndCancel 同等价语义,这里通过 SchedulerModule
 * 注册以避免 import GroceryOrderModule(即 EventsModule)的循环依赖。
 */
@Injectable()
export class GroceryOrderExpireJob extends BaseJob {
  readonly name = 'grocery-order-expire';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(GroceryOrder) private readonly orderRepo: Repository<GroceryOrder>,
    private readonly dataSource: DataSource,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/60 * * * * *', { name: 'grocery-order-expire' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const list = await this.orderRepo
      .createQueryBuilder('o')
      .where('o.status = :s', { s: 'WAIT_PAY' })
      .andWhere('o.expire_at < :now', { now: String(now) })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!list.length) {
      this.logger.debug('[grocery-order-expire] no overdue orders');
      return;
    }
    this.logger.warn(`[grocery-order-expire] cancelling ${list.length} overdue grocery orders`);

    for (const o of list) {
      try {
        await this.dataSource.transaction(async (em) => {
          const items = await em.getRepository(GroceryOrderItem).find({ where: { groceryOrderId: o.groceryOrderId } });
          for (const it of items) {
            await em.getRepository(Product).increment({ productId: it.productId }, 'stock', it.estimatedQuantity);
          }
          await em.getRepository(PickupTimeSlot).decrement({ slotId: o.pickupSlotId }, 'reserved', 1);
          await em.getRepository(GroceryOrder).update(
            { groceryOrderId: o.groceryOrderId },
            {
              status: 'CANCELLED',
              cancelledAt: String(now),
              cancelledBy: 'system',
              cancelReason: 'PAY_TIMEOUT',
              updatedAt: String(now),
            },
          );
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[grocery-order-expire] failed orderId=${o.groceryOrderId}: ${msg}`);
      }
    }
  }
}
