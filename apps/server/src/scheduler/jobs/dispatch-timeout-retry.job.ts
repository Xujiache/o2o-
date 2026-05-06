import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { DispatchTask, RiderStatus } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const MAX_RETRY = 3;
const NEXT_TIMEOUT_MS = 30_000;
const SCAN_LIMIT = 100;

/**
 * Stage 8 — 派单超时重试。每 10s 扫描 PENDING 且 timeout_at < now 的派单。
 *  - retry_count >= MAX_RETRY:标 TIMEOUT 终止
 *  - 否则:重新挑候选骑手 + retry_count++ + emit DispatchStarted 重派
 */
@Injectable()
export class DispatchTimeoutRetryJob extends BaseJob {
  readonly name = 'dispatch-timeout-retry';
  protected override lockTtlMs = 30_000;

  constructor(
    @InjectRepository(DispatchTask) private readonly dispatchRepo: Repository<DispatchTask>,
    @InjectRepository(RiderStatus) private readonly riderStatusRepo: Repository<RiderStatus>,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('*/10 * * * * *', { name: 'dispatch-timeout-retry' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const overdue = await this.dispatchRepo.find({
      where: { status: 'PENDING', timeoutAt: LessThan(String(now)) },
      take: SCAN_LIMIT,
    });
    if (!overdue.length) return;

    for (const t of overdue) {
      try {
        if (t.retryCount >= MAX_RETRY) {
          await this.dispatchRepo.update(
            { dispatchTaskId: t.dispatchTaskId },
            { status: 'TIMEOUT', updatedAt: String(now) },
          );
          this.logger.warn(`[dispatch-timeout-retry] terminal TIMEOUT ${t.dispatchTaskId}`);
          continue;
        }

        const onlineRiders = await this.riderStatusRepo.find({
          where: { onlineStatus: 'online' },
          take: 50,
        });
        const candidates = onlineRiders.map((r) => r.riderId);

        await this.dispatchRepo.update(
          { dispatchTaskId: t.dispatchTaskId },
          {
            retryCount: t.retryCount + 1,
            candidateRiderIds: candidates,
            timeoutAt: String(now + NEXT_TIMEOUT_MS),
            updatedAt: String(now),
          },
        );

        await this.eventBus.publish(
          EventName.DispatchStarted,
          {
            dispatchTaskId: t.dispatchTaskId,
            bizType: t.bizType,
            bizOrderId: t.bizOrderId,
            bizTaskId: t.bizTaskId,
            candidateRiderIds: candidates,
            dispatchedAt: now,
          },
          { bizType: 'dispatch-task', bizId: t.dispatchTaskId },
        );
        this.logger.log(`[dispatch-timeout-retry] retry ${t.dispatchTaskId} count=${t.retryCount + 1}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[dispatch-timeout-retry] failed ${t.dispatchTaskId}: ${msg}`);
      }
    }
  }
}
