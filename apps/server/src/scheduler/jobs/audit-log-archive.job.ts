/**
 * AuditLogArchiveJob:
 *   - 归档超过 90 天的 sys_audit_log 主键(压缩落 MongoDB 集合 audit_log_archive)
 *   - stage 0 仅实现框架(扫描 + 计数 + metrics);压缩 / 冷存储 / 删除 由阶段 11 定。
 *   - 周期可配(默认每天 03:00 跑)。
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { SysAuditLog } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_BATCH_SIZE = 500;

@Injectable()
export class AuditLogArchiveJob extends BaseJob {
  readonly name = 'audit-log-archive';
  protected override lockTtlMs = 30 * 60_000;

  constructor(
    @InjectRepository(SysAuditLog) private readonly auditRepo: Repository<SysAuditLog>,
    private readonly config: ConfigService,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'audit-log-archive' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const retentionDays = this.config.get<number>('scheduler.auditLogRetentionDays') ?? DEFAULT_RETENTION_DAYS;
    const batchSize = this.config.get<number>('scheduler.auditLogArchiveBatchSize') ?? DEFAULT_BATCH_SIZE;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    const expired = await this.auditRepo.find({
      where: { createdAt: LessThan(String(cutoff)) },
      take: batchSize,
    });
    if (expired.length === 0) {
      this.logger.log('no audit rows older than cutoff');
      return;
    }

    // TODO: 阶段 11 接入压缩(gzip)与冷存储(Mongo audit_log_archive 集合 / S3 Glacier)
    // TODO: 阶段 11 在归档成功后从 sys_audit_log 删除已归档主键
    this.logger.log(
      `[framework only] would archive ${expired.length} rows; cutoff=${new Date(cutoff).toISOString()} retentionDays=${retentionDays} batchSize=${batchSize}`,
    );
  }
}
