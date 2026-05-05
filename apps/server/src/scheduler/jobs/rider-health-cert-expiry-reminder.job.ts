/**
 * RiderHealthCertExpiryReminderJob:
 *   每日 8:00 扫 rider_account 健康证状态
 *    - expiry 在 7 天内到期:写 audit_log reminder
 *    - expiry 已过期:强制下线(发 RiderOffline reason='health-cert-expired')+ 写 audit_log
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';

import { RiderAccount, RiderAuditLog, RiderStatus } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;

@Injectable()
export class RiderHealthCertExpiryReminderJob extends BaseJob {
  readonly name = 'rider-health-cert-expiry-reminder';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderStatus) private readonly statusRepo: Repository<RiderStatus>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    protected readonly lock: DistributedLockService,
    private readonly eventBus: DomainEventBus,
  ) {
    super();
  }

  @Cron('0 8 * * *', { name: 'rider-health-cert-expiry-reminder' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = Date.now();
    const future = now + SEVEN_DAYS_MS;
    const now2 = String(now);

    // 1. 即将到期(7 天内)— 写 reminder 不下线
    const expiring = await this.riderRepo.find({
      where: {
        accountStatus: 'active',
        healthCertExpiry: Between(String(now), String(future)),
      },
      take: 200,
    });
    for (const r of expiring) {
      await this.auditLogRepo.insert({
        riderId: r.riderId,
        applicationId: null,
        eventType: 'health_cert_expiring',
        operatorType: 'system',
        operatorId: null,
        detail: { healthCertExpiry: r.healthCertExpiry ?? '' },
        createdAt: now2,
      });
    }

    // 2. 已过期 — 强制下线 + 发 offline 事件
    const expired = await this.riderRepo.find({
      where: { accountStatus: 'active', healthCertExpiry: LessThan(String(now)) },
      take: 200,
    });
    for (const r of expired) {
      try {
        const status = await this.statusRepo.findOne({ where: { riderId: r.riderId } });
        if (status && status.onlineStatus === 'online') {
          await this.statusRepo.update({ statusId: status.statusId }, { onlineStatus: 'offline', updatedAt: now2 });
          await this.eventBus.publish(
            EventName.RiderOffline,
            { riderId: r.riderId, reason: 'health-cert-expired' },
            { bizType: 'rider', bizId: r.riderId },
          );
        }
        await this.auditLogRepo.insert({
          riderId: r.riderId,
          applicationId: null,
          eventType: 'health_cert_expired',
          operatorType: 'system',
          operatorId: null,
          detail: { healthCertExpiry: r.healthCertExpiry ?? '' },
          createdAt: now2,
        });
      } catch (e: unknown) {
        this.logger.warn(`[health-cert-expired] rider ${r.riderId} failed: ${e instanceof Error ? e.message : e}`);
      }
    }

    this.logger.log(`health cert: ${expiring.length} expiring + ${expired.length} expired`);
  }
}
