import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { RiderEarning, RiderViolation } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

const SCAN_LIMIT = 200;

/**
 * Stage 8 — 违规扣款生成。每日 03:00 扫描 status=CONFIRMED 且 deduct_cents>0 且未扣到任何收益的违规。
 * 把 deduct_cents 加到对应骑手当日(或最近 PENDING)的 rider_earning.deduct_amount,并标记 deducted_to_earning_id。
 */
@Injectable()
export class RiderViolationDeductJob extends BaseJob {
  readonly name = 'rider-violation-deduct';
  protected override lockTtlMs = 60 * 60_000;

  constructor(
    @InjectRepository(RiderViolation) private readonly violationRepo: Repository<RiderViolation>,
    @InjectRepository(RiderEarning) private readonly earningRepo: Repository<RiderEarning>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 0 3 * * *', { name: 'rider-violation-deduct' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const violations = await this.violationRepo.find({
      where: {
        status: 'CONFIRMED',
        deductCents: MoreThan('0'),
        deductedToEarningId: IsNull(),
      },
      take: SCAN_LIMIT,
    });
    if (!violations.length) return;

    const now = Date.now();
    for (const v of violations) {
      try {
        const earning = await this.earningRepo.findOne({
          where: { riderId: v.riderId, status: 'PENDING' },
          order: { settleDate: 'DESC' },
        });
        if (!earning) {
          this.logger.warn(
            `[rider-violation-deduct] no PENDING earning for rider=${v.riderId}, skip violation=${v.riderViolationId}`,
          );
          continue;
        }

        const deduct = BigInt(v.deductCents ?? '0');
        const newDeduct = BigInt(earning.deductAmount) + deduct;
        const newTotal = BigInt(earning.totalAmount) - deduct;
        await this.earningRepo.update(
          { riderEarningId: earning.riderEarningId },
          {
            deductAmount: newDeduct.toString(),
            totalAmount: newTotal.toString(),
            updatedAt: String(now),
          },
        );
        await this.violationRepo.update(
          { riderViolationId: v.riderViolationId },
          { deductedToEarningId: earning.riderEarningId, updatedAt: String(now) },
        );
        this.logger.log(
          `[rider-violation-deduct] rider=${v.riderId} violation=${v.riderViolationId} deduct=${v.deductCents} → earning=${earning.riderEarningId}`,
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[rider-violation-deduct] failed violation=${v.riderViolationId}: ${msg}`);
      }
    }
  }
}
