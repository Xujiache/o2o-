import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';

import { RiderTask, RiderViolation } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const LATE_GRACE_MS = 5 * 60 * 1000;
const SCAN_LIMIT = 100;
const DEFAULT_DEDUCT_CENTS = 200;

/**
 * Stage 8 — 配送超时标记。每 1min 扫 rider_task DELIVERING 且 eta_at + 5min < now → 写违规 LATE。
 * 防重:rider_task_id 已有 LATE violation 时跳过。
 */
@Injectable()
export class DeliveryTimeoutMarkJob extends BaseJob {
  readonly name = 'delivery-timeout-mark';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(RiderTask) private readonly taskRepo: Repository<RiderTask>,
    @InjectRepository(RiderViolation) private readonly violationRepo: Repository<RiderViolation>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 * * * * *', { name: 'delivery-timeout-mark' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const cutoff = now - LATE_GRACE_MS;
    const overdueTasks = await this.taskRepo.find({
      where: { status: In(['PICKED_UP', 'DELIVERING']), etaAt: LessThan(String(cutoff)) },
      take: SCAN_LIMIT,
    });
    if (!overdueTasks.length) return;

    for (const t of overdueTasks) {
      try {
        const existing = await this.violationRepo.findOne({
          where: { riderTaskId: t.riderTaskId, type: 'LATE' },
        });
        if (existing) continue;

        await this.violationRepo.save(
          this.violationRepo.create({
            riderId: t.riderId,
            riderTaskId: t.riderTaskId,
            type: 'LATE',
            description: `配送超时 (eta=${t.etaAt})`,
            photosJson: null,
            deductCents: String(DEFAULT_DEDUCT_CENTS),
            status: 'CONFIRMED',
            reportedAt: String(now),
            decidedAt: String(now),
            decision: 'auto-late',
            deductedToEarningId: null,
            createdAt: String(now),
            updatedAt: String(now),
          }),
        );
        this.logger.warn(`[delivery-timeout-mark] LATE violation rider=${t.riderId} task=${t.riderTaskId}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[delivery-timeout-mark] failed task=${t.riderTaskId}: ${msg}`);
      }
    }
  }
}
