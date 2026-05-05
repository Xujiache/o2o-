/**
 * RiderAuditTimeoutReminderJob:
 *   每日 9:00 扫 rider_application WHERE audit_status='pending' AND submitted_at < NOW-72h
 *   写 audit_log audit_timeout(本阶段不发短信,占位 — stage 11 接通知)
 */
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { RiderApplication, RiderAuditLog } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const AUDIT_TIMEOUT_MS = 72 * 60 * 60_000;

@Injectable()
export class RiderAuditTimeoutReminderJob extends BaseJob {
  readonly name = 'rider-audit-timeout-reminder';
  protected override lockTtlMs = 5 * 60_000;

  constructor(
    @InjectRepository(RiderApplication) private readonly appRepo: Repository<RiderApplication>,
    @InjectRepository(RiderAuditLog) private readonly auditLogRepo: Repository<RiderAuditLog>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 9 * * *', { name: 'rider-audit-timeout-reminder' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const cutoff = String(Date.now() - AUDIT_TIMEOUT_MS);
    const rows = await this.appRepo.find({
      where: { auditStatus: 'pending', submittedAt: LessThan(cutoff) },
      take: 200,
    });
    if (rows.length === 0) {
      this.logger.debug('no pending applications older than 72h');
      return;
    }
    const now = String(Date.now());
    for (const r of rows) {
      await this.auditLogRepo.insert({
        riderId: r.riderId,
        applicationId: r.applicationId,
        eventType: 'audit_timeout',
        operatorType: 'system',
        operatorId: null,
        detail: { submittedAt: r.submittedAt, mobile: r.mobile },
        createdAt: now,
      });
    }
    this.logger.warn(`audit timeout reminder: ${rows.length} applications pending > 72h`);
  }
}
