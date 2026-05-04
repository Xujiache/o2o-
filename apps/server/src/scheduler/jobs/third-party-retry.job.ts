/**
 * ThirdPartyRetryJob:
 *   - 扫描 integration_request_log 中 status='failed' 或 'retrying' 且 next_retry_at <= now 的记录
 *   - 触发补偿重试(stage 0 不真实回调第三方,仅推进状态机 + 指数退避更新 next_retry_at)
 * 周期:每分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, Repository } from 'typeorm';

import { IntegrationRequestLog } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const MAX_RETRY = 5;
const BACKOFF_BASE_MS = 30_000;

@Injectable()
export class ThirdPartyRetryJob extends BaseJob {
  readonly name = 'third-party-retry';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(IntegrationRequestLog)
    private readonly logRepo: Repository<IntegrationRequestLog>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'third-party-retry' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const candidates = await this.logRepo.find({
      where: {
        status: In(['failed', 'retrying']),
        nextRetryAt: LessThanOrEqual(String(now)),
      },
      take: 50,
    });

    if (candidates.length === 0) {
      this.logger.debug('no candidates to retry');
      return;
    }

    for (const row of candidates) {
      if (row.retryCount >= MAX_RETRY) {
        await this.logRepo.update({ id: row.id }, { status: 'failed', updatedAt: String(now) });
        continue;
      }
      // TODO: 阶段 4+ 接入 IntegrationGatewayService 的 real adapter 重新执行
      const nextRetry = now + BACKOFF_BASE_MS * 2 ** row.retryCount;
      await this.logRepo.update(
        { id: row.id },
        {
          status: 'retrying',
          retryCount: row.retryCount + 1,
          nextRetryAt: String(nextRetry),
          updatedAt: String(now),
        },
      );
    }
    this.logger.log(`scheduled retry for ${candidates.length} integration request log rows`);
  }
}
