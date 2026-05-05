/**
 * DisabledAccountTokenBroadcastJob:
 *   每 5 分钟扫近 10 分钟内新增的 account_disable_record(action=disable),
 *   写 Redis `<scope>:account-revoked:<accountId>` 标记(冗余 AccountDisabledSubscriber,兜底重启场景)。
 *
 *   实际 token 吊销由 service 层同步 + AccountDisabledSubscriber 异步双保险,本 job 是第三道兜底。
 */
import { Inject, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { MoreThan, Repository } from 'typeorm';

import { REDIS_CLIENT } from '../../config/redis.module';
import { AccountDisableRecord } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_WINDOW_MS = 10 * 60_000; // 10 min(覆盖 5min cron + 5min 缓冲)
const TOKEN_REVOKED_TTL_SECONDS = 7 * 24 * 3600;

@Injectable()
export class DisabledAccountTokenBroadcastJob extends BaseJob {
  readonly name = 'disabled-account-token-broadcast';
  protected override lockTtlMs = 4 * 60_000;

  constructor(
    @InjectRepository(AccountDisableRecord) private readonly repo: Repository<AccountDisableRecord>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 */5 * * * *', { name: 'disabled-account-token-broadcast' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = Date.now() - SCAN_WINDOW_MS;
    const rows = await this.repo.find({
      where: {
        action: 'disable',
        createdAt: MoreThan(String(cutoff)),
      },
      take: 500,
    });
    if (!rows.length) {
      this.logger.debug('[disabled-token-broadcast] no recent disable records');
      return;
    }
    let success = 0;
    for (const row of rows) {
      const key = `${row.accountType}:account-revoked:${row.accountId}`;
      try {
        await this.redis.set(key, row.createdAt, 'EX', TOKEN_REVOKED_TTL_SECONDS);
        success++;
      } catch {
        // ignore single-key failure
      }
    }
    this.logger.log(`[disabled-token-broadcast] processed=${rows.length} success=${success}`);
  }
}
