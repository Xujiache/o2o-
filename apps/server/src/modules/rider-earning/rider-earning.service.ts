import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { RiderEarning } from '../../database/entities';

import type { EarningQueryDto, EarningSummaryVo } from './rider-earning.dto';

@Injectable()
export class RiderEarningService {
  constructor(@InjectRepository(RiderEarning) private readonly earningRepo: Repository<RiderEarning>) {}

  async query(riderId: string, q: EarningQueryDto): Promise<EarningSummaryVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 30));

    const where: Record<string, unknown> = { riderId };
    if (q.fromDate && q.toDate) {
      where.settleDate = Between(q.fromDate, q.toDate);
    }

    const rows = await this.earningRepo.find({
      where,
      order: { settleDate: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    let totalIncome = 0n;
    let orderCount = 0;
    let rewardAmount = 0n;
    let deductAmount = 0n;
    for (const r of rows) {
      totalIncome += BigInt(r.totalAmount);
      orderCount += Number(r.orderCount);
      rewardAmount += BigInt(r.rewardAmount);
      deductAmount += BigInt(r.deductAmount);
    }

    return {
      totalIncome: totalIncome.toString(),
      orderCount,
      rewardAmount: rewardAmount.toString(),
      deductAmount: deductAmount.toString(),
      items: rows.map((r) => ({
        earningId: r.riderEarningId,
        settleDate: Number(r.settleDate),
        orderCount: Number(r.orderCount),
        baseAmount: r.baseAmount,
        distanceAmount: r.distanceAmount,
        timelyBonus: r.timelyBonus,
        rewardAmount: r.rewardAmount,
        deductAmount: r.deductAmount,
        totalAmount: r.totalAmount,
        status: r.status,
      })),
      pageNo,
      pageSize,
    };
  }
}
