import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { ErrandOrder, ErrandTask, ErrandTimeline } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const NO_RIDER_CANCEL_MS = 10 * 60 * 1000;
const SCAN_LIMIT = 50;

/**
 * Stage 6 — 跑腿订单 10 min 无人接单 → 自动取消 + 全额退款(走 ErrandNoRiderCancelled 事件 → refund subscriber)。
 * 每 1 分钟扫一次。
 */
@Injectable()
export class NoRiderCancelJob extends BaseJob {
  readonly name = 'no-rider-cancel';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(ErrandOrder) private readonly orderRepo: Repository<ErrandOrder>,
    @InjectRepository(ErrandTask) private readonly taskRepo: Repository<ErrandTask>,
    private readonly dataSource: DataSource,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('30 */1 * * * *', { name: 'no-rider-cancel' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const tasks = await this.taskRepo
      .createQueryBuilder('t')
      .where("t.status = 'READY_FOR_DISPATCH'")
      .andWhere('t.created_at < :threshold', { threshold: String(now - NO_RIDER_CANCEL_MS) })
      .limit(SCAN_LIMIT)
      .getMany();
    if (!tasks.length) return;
    this.logger.log(`[no-rider-cancel] processing ${tasks.length} stale tasks`);

    for (const task of tasks) {
      const order = await this.orderRepo.findOne({ where: { errandOrderId: task.errandOrderId } });
      if (!order || order.status === 'CANCELLED') continue;

      try {
        await this.dataSource.transaction(async (em: EntityManager) => {
          await em.getRepository(ErrandOrder).update(
            { errandOrderId: order.errandOrderId },
            {
              status: 'CANCELLED',
              cancelledAt: String(now),
              cancelledBy: 'system',
              cancelReason: 'NO_RIDER',
              updatedAt: String(now),
            },
          );
          await em
            .getRepository(ErrandTask)
            .update({ errandTaskId: task.errandTaskId }, { status: 'CANCELLED', updatedAt: String(now) });
          await em.getRepository(ErrandTimeline).insert({
            errandOrderId: order.errandOrderId,
            eventType: 'CANCELLED',
            payload: { cancelledBy: 'system', reason: 'NO_RIDER' },
            operator: 'system',
            createdAt: String(now),
          });
        });

        await this.eventBus.publish(
          EventName.ErrandNoRiderCancelled,
          {
            orderId: order.errandOrderId,
            customerId: order.customerId,
            payOrderId: order.payOrderId,
            refundAmount: order.payableAmount,
            cancelledAt: now,
          },
          { bizType: 'errand-order', bizId: order.errandOrderId },
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[no-rider-cancel] failed orderId=${order.errandOrderId}: ${msg}`);
      }
    }
  }
}
