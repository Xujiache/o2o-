/**
 * RealnameRetryJob:
 *   - 扫 realname_record.status='pending' 且 updated_at < NOW()-5min 的记录
 *   - 重新调 ali-realname mock(本阶段:首字汉字 → success;否则 → failed)
 *   - 成功时更新 customer_user.realname_status='verified'
 * 周期:每分钟。
 */
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { CustomerUser, RealnameRecord } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const STALE_MS = 5 * 60 * 1000;

@Injectable()
export class RealnameRetryJob extends BaseJob {
  readonly name = 'realname-retry';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(RealnameRecord) private readonly recordRepo: Repository<RealnameRecord>,
    @InjectRepository(CustomerUser) private readonly userRepo: Repository<CustomerUser>,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron(CronExpression.EVERY_MINUTE, { name: 'realname-retry' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = Date.now() - STALE_MS;
    const candidates = await this.recordRepo.find({
      where: { status: 'pending', updatedAt: LessThan(String(cutoff)) },
      take: 50,
    });
    if (candidates.length === 0) {
      this.logger.debug('no pending realname records to retry');
      return;
    }
    let success = 0;
    let failed = 0;
    for (const r of candidates) {
      try {
        const result = await this.gateway.realname.verify(r.realName, r.idCardNo);
        const now = Date.now();
        if (result.success) {
          await this.recordRepo.update(
            { recordId: r.recordId },
            {
              status: 'success',
              providerRequestId: result.providerRequestId,
              verifiedAt: String(now),
              updatedAt: String(now),
            },
          );
          await this.userRepo.update({ userId: r.userId }, { realnameStatus: 'verified', updatedAt: String(now) });
          await this.eventBus.publish(
            EventName.CustomerRealnameVerified,
            { userId: r.userId, verifiedAt: now },
            { bizType: 'customer-realname', bizId: r.recordId },
          );
          success++;
        } else {
          await this.recordRepo.update(
            { recordId: r.recordId },
            {
              status: 'failed',
              providerRequestId: result.providerRequestId,
              failedReason: result.reason ?? '内容不符',
              updatedAt: String(now),
            },
          );
          await this.userRepo.update({ userId: r.userId }, { realnameStatus: 'failed', updatedAt: String(now) });
          failed++;
        }
      } catch (err) {
        this.logger.warn({ err, recordId: r.recordId }, 'realname retry failed');
      }
    }
    this.logger.log(`retried ${candidates.length} realname records: ${success} success, ${failed} failed`);
  }
}
