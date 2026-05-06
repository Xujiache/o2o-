import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CouponRule } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

/**
 * Stage 9 — 营销活动起停。每 1min 扫:
 * - DRAFT 且 validFrom<=now → ACTIVE
 * - ACTIVE 且 validTo<=now → EXPIRED(coupon-expire 每日 00:00 兜底)
 */
@Injectable()
export class MarketingActivityToggleJob extends BaseJob {
  readonly name = 'marketing-activity-toggle';
  protected override lockTtlMs = 60_000;

  constructor(
    @InjectRepository(CouponRule) private readonly repo: Repository<CouponRule>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 * * * * *', { name: 'marketing-activity-toggle' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = String(Date.now());
    await this.repo
      .createQueryBuilder()
      .update(CouponRule)
      .set({ status: 'ACTIVE', updatedAt: now })
      .where('status = :draft AND valid_from <= :now AND valid_to > :now', { draft: 'DRAFT', now })
      .execute();
    await this.repo
      .createQueryBuilder()
      .update(CouponRule)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where('status = :active AND valid_to <= :now', { active: 'ACTIVE', now })
      .execute();
  }
}
