import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CouponRule } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

/**
 * Stage 9 — 优惠券过期。每日 00:00 扫 validTo<now 且 status in (DRAFT,ACTIVE) 标 EXPIRED。
 */
@Injectable()
export class CouponExpireJob extends BaseJob {
  readonly name = 'coupon-expire';
  protected override lockTtlMs = 30 * 60_000;

  constructor(
    @InjectRepository(CouponRule) private readonly repo: Repository<CouponRule>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 0 0 * * *', { name: 'coupon-expire' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const now = String(Date.now());
    await this.repo
      .createQueryBuilder()
      .update(CouponRule)
      .set({ status: 'EXPIRED', updatedAt: now })
      .where('valid_to < :now AND status IN (:...active)', { now, active: ['DRAFT', 'ACTIVE'] })
      .execute();
  }
}
