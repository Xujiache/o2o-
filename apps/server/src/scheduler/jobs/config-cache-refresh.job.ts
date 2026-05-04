/**
 * ConfigCacheRefreshJob:
 *   - 兜底 1 分钟轮询 sys_config 表,刷新 Redis 缓存(`cache:sys_config:<key>`)
 *   - 实时刷新由 ConfigChanged 事件驱动(T24 接入 — 事件订阅器调本 service.refreshAll)
 * 周期:每分钟。
 */
import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { SysConfig } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const CACHE_PREFIX = 'cache:sys_config:';
const CACHE_TTL_SECONDS = 5 * 60;

@Injectable()
export class ConfigCacheRefreshJob extends BaseJob {
  readonly name = 'config-cache-refresh';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(SysConfig) private readonly configRepo: Repository<SysConfig>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'config-cache-refresh' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const rows = await this.configRepo.find();
    if (rows.length === 0) return;
    const pipe = this.redis.pipeline();
    for (const row of rows) {
      pipe.set(CACHE_PREFIX + row.configKey, row.configValue ?? '', 'EX', CACHE_TTL_SECONDS);
    }
    await pipe.exec();
    this.logger.log(`refreshed ${rows.length} sys_config keys to redis`);
  }

  /** 由 T24 ConfigChanged 事件订阅器调用 — 单 key 即时刷新 */
  async refreshOne(key: string): Promise<void> {
    const row = await this.configRepo.findOne({ where: { configKey: key } });
    if (!row) {
      await this.redis.del(CACHE_PREFIX + key);
      return;
    }
    await this.redis.set(CACHE_PREFIX + key, row.configValue ?? '', 'EX', CACHE_TTL_SECONDS);
  }
}
