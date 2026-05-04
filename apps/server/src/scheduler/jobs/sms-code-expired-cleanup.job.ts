/**
 * SmsCodeExpiredCleanupJob:
 *   - 清理 sms_code.expire_at < NOW()-7天 的记录(保留 7 天用于审计)
 * 周期:每 5 分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { SmsCode } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SmsCodeExpiredCleanupJob extends BaseJob {
  readonly name = 'sms-code-expired-cleanup';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(SmsCode) private readonly repo: Repository<SmsCode>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'sms-code-expired-cleanup' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = Date.now() - RETENTION_MS;
    const r = await this.repo.delete({ expireAt: LessThan(String(cutoff)) });
    this.logger.log(`cleaned ${r.affected ?? 0} expired sms_code rows`);
  }
}
