import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ErrandOrder, ErrandTimeline } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_LIMIT = 100;

/**
 * Stage 6 — 跑腿订单 15 min 未支付自动关单。
 * Cron 每 30 秒一次。无库存释放(跑腿无库存概念)。
 */
@Injectable()
export class WaitPayTimeoutCloseErrandJob extends BaseJob {
  readonly name = 'wait-pay-timeout-close-errand';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    private readonly dataSource: DataSource,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/30 * * * * *', { name: 'wait-pay-timeout-close-errand' })
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
    if (!orders.length) return;
    this.logger.log(`[wait-pay-timeout-close-errand] processing ${orders.length} expired orders`);

    for (const order of orders) {
      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          await em.getRepository(ErrandOrder).update(
            { errandOrderId: order.errandOrderId },
            {
              status: 'CANCELLED',
              cancelledAt: String(now),
              cancelledBy: 'system',
              cancelReason: 'WAIT_PAY_TIMEOUT',
              updatedAt: String(now),
            },
          );
          await em.getRepository(ErrandTimeline).insert({
            errandOrderId: order.errandOrderId,
            eventType: 'CANCELLED',
            payload: { cancelledBy: 'system', reason: 'WAIT_PAY_TIMEOUT' },
            operator: 'system',
            createdAt: String(now),
          });
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[wait-pay-timeout-close-errand] failed orderId=${order.errandOrderId}: ${msg}`);
      }
    }
  }
}
