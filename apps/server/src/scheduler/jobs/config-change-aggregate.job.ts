/**
 * ConfigChangeAggregateJob:
 *   每小时整点聚合 sys_audit_log 中配置类事件 → log 一行汇总。
 *   stage 4 简版:不写专用聚合表,仅日志输出供运维观察。
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';

import { SysAuditLog } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const ONE_HOUR_MS = 3600_000;

const CONFIG_TARGET_TYPES = [
  'sys-config',
  'third-party-config',
  'sys-role-permission',
  'city-site',
  'platform-category',
];

@Injectable()
export class ConfigChangeAggregateJob extends BaseJob {
  readonly name = 'config-change-aggregate';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(SysAuditLog) private readonly repo: Repository<SysAuditLog>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 0 * * * *', { name: 'config-change-aggregate' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const end = Date.now();
    const start = end - ONE_HOUR_MS;
    const rows = await this.repo.find({
      where: {
        targetType: In(CONFIG_TARGET_TYPES),
        createdAt: Between(String(start), String(end)),
      },
    });
    const summary: Record<string, number> = {};
    for (const r of rows) {
      summary[r.targetType] = (summary[r.targetType] ?? 0) + 1;
    }
    if (rows.length === 0) {
      this.logger.debug('[config-change-aggregate] no config events in last hour');
      return;
    }
    this.logger.log(`[config-change-aggregate] 1h window total=${rows.length} breakdown=${JSON.stringify(summary)}`);
  }
}
