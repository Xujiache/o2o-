import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ErrandOrder } from '../../database/entities';
import { ErrandDispatchService } from '../../modules/errand-dispatch/errand-dispatch.service';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const TRIGGER_AHEAD_MS = 10 * 60 * 1000; // 10 min 提前触发
const SCAN_LIMIT = 50;

/**
 * Stage 6 — 预约跑腿到点(reservedTime ≤ now+10min)的 PAID 订单进入调度池。
 * 每 30 秒扫一次。
 */
@Injectable()
export class ReservedErrandDispatchJob extends BaseJob {
  readonly name = 'reserved-errand-dispatch';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    private readonly dispatch: ErrandDispatchService,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'reserved-errand-dispatch' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const orders = await this.orderRepo
      .createQueryBuilder('o')
      .where("o.status = 'PAID'")
      .andWhere('o.reserved_time IS NOT NULL')
      .andWhere('o.reserved_time <= :threshold', { threshold: String(now + TRIGGER_AHEAD_MS) })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!orders.length) return;
    this.logger.log(`[reserved-errand-dispatch] processing ${orders.length} reserved orders`);

    for (const order of orders) {
      try {
        await this.dispatch.createTask(order.errandOrderId, 'reserved');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[reserved-errand-dispatch] failed orderId=${order.errandOrderId}: ${msg}`);
      }
    }
  }
}
