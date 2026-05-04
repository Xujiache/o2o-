/**
 * DomainEventRetryJob — 兜底重试 domain_event 表中 status=retrying / nextRetryAt<=now 的事件。
 * 类似 ThirdPartyRetryJob,但目标表是 domain_event。
 *
 * 每分钟扫一次,单批最多 50 条;超过 MAX_RETRY 次后置 failed。
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { DomainEvent } from '../../database/entities';
import { DomainEventBus } from '../domain-event-bus';
import type { EventName, EventPayloadMap } from '../events';

const MAX_RETRY = 5;
const BATCH_SIZE = 50;

@Injectable()
export class DomainEventRetryJob {
  private readonly logger = new Logger(DomainEventRetryJob.name);

  constructor(
    @InjectRepository(DomainEvent) private readonly repo: Repository<DomainEvent>,
    private readonly bus: DomainEventBus,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'domain-event-retry' })
  async tick(): Promise<void> {
    await this.run();
  }

  async run(): Promise<{ scheduled: number }> {
    const now = Date.now();
    const candidates = await this.repo.find({
      where: { status: 'retrying', nextRetryAt: LessThanOrEqual(String(now)) },
      take: BATCH_SIZE,
    });

    if (candidates.length === 0) return { scheduled: 0 };

    let processed = 0;
    for (const row of candidates) {
      if (row.retryCount >= MAX_RETRY) {
        await this.repo.update({ eventId: row.eventId }, { status: 'failed', updatedAt: String(Date.now()) });
        this.logger.warn(`event ${row.eventId} exceeded MAX_RETRY=${MAX_RETRY}; status=failed`);
        continue;
      }
      const name = row.bizType as EventName;
      const payload = (row.payload ?? {}) as unknown as EventPayloadMap[typeof name];
      await this.bus.dispatch(row.eventId, name, payload, row.retryCount);
      processed += 1;
    }

    this.logger.log(`retried ${processed} domain events`);
    return { scheduled: processed };
  }
}
