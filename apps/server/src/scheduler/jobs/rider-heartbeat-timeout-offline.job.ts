/**
 * RiderHeartbeatTimeoutOfflineJob:
 *   每分钟扫 rider_status WHERE online_status='online' AND last_heartbeat_at < NOW-60s
 *   将这些 rider UPDATE 为 offline + 发布 domain.rider.offline reason='heartbeat-timeout'
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { RiderAuditLog, RiderStatus } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const HEARTBEAT_TIMEOUT_MS = 60_000;

@Injectable()
export class RiderHeartbeatTimeoutOfflineJob extends BaseJob {
  readonly name = 'rider-heartbeat-timeout-offline';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    protected readonly lock: DistributedLockService,
    private readonly eventBus: DomainEventBus,
  ) {
    super();
  }

  @Cron('*/1 * * * *', { name: 'rider-heartbeat-timeout-offline' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = String(Date.now() - HEARTBEAT_TIMEOUT_MS);
    const rows = await this.statusRepo.find({
      where: { onlineStatus: 'online', lastHeartbeatAt: LessThan(cutoff) },
      take: 200,
    });
    if (rows.length === 0) {
      this.logger.debug('no riders need heartbeat timeout offline');
      return;
    }
    const now = String(Date.now());
    for (const row of rows) {
      try {
        await this.statusRepo.update({ statusId: row.statusId }, { onlineStatus: 'offline', updatedAt: now });
        await this.auditLogRepo.insert({
          riderId: row.riderId,
          applicationId: null,
          eventType: 'offline',
          operatorType: 'system',
          operatorId: null,
          detail: { reason: 'heartbeat-timeout', lastHeartbeatAt: row.lastHeartbeatAt ?? '' },
          createdAt: now,
        });
        await this.eventBus.publish(
          EventName.RiderOffline,
          { riderId: row.riderId, reason: 'heartbeat-timeout' },
          { bizType: 'rider', bizId: row.riderId },
        );
      } catch (e: unknown) {
        this.logger.warn(`[heartbeat-timeout] rider ${row.riderId} failed: ${e instanceof Error ? e.message : e}`);
      }
    }
    this.logger.log(`heartbeat timeout offline: ${rows.length} riders`);
  }
}
