/**
 * ExpiredCleanupJob:
 *   - 清理过期幂等记录(idempotency_record.expire_at < now)
 *   - 清理过期验证码(stage 0 验证码尚未落库 — 留扩展点)
 * 周期:每 5 分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { IdempotencyRecord } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

@Injectable()
export class ExpiredCleanupJob extends BaseJob {
  readonly name = 'expired-cleanup';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(IdempotencyRecord)
    private readonly idempotencyRepo: Repository<IdempotencyRecord>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'expired-cleanup' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const r = await this.idempotencyRepo.delete({ expireAt: LessThan(String(now)) });
    this.logger.log(`cleaned ${r.affected ?? 0} expired idempotency_record rows`);
    // TODO: 验证码表在 stage 1 接入后,扩展到此处
  }
}
