import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Between, Repository } from 'typeorm';

import { MerchantStatisticsSnapshot, Store } from '../../database/entities';

import type { StatisticsQueryDto, StatisticsVo, TopItemVo } from './merchant-statistics.dto';

function toSnapshotDate(d: Date): number {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return Number(`${y}${m}${day}`);
}

@Injectable()
export class MerchantStatisticsService {
  constructor(
    @InjectRepository(MerchantStatisticsSnapshot)
    private readonly snapshotRepo: Repository<MerchantStatisticsSnapshot>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  private resolveDateRange(range: string | undefined): { start: number; end: number } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toSnapshotDate(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toSnapshotDate(yesterday);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartKey = toSnapshotDate(weekStart);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartKey = toSnapshotDate(monthStart);

    switch (range) {
      case 'YESTERDAY':
        return { start: yesterdayKey, end: yesterdayKey };
      case 'WEEK':
        return { start: weekStartKey, end: todayKey };
      case 'MONTH':
        return { start: monthStartKey, end: todayKey };
      case 'TODAY':
      default:
        return { start: todayKey, end: todayKey };
    }
  }

  async query(merchantId: string, dto: StatisticsQueryDto): Promise<StatisticsVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const { start, end } = this.resolveDateRange(dto.range);
    const rows = await this.snapshotRepo.find({
      where: { storeId: store.storeId, snapshotDate: Between(start, end) },
    });

    let orderCount = 0;
    let gross = 0n;
    let refund = 0n;
    let net = 0n;
    let ratingSum = 0;
    let ratingCount = 0;
    const topMap = new Map<string, TopItemVo>();
    for (const r of rows) {
      orderCount += Number(r.orderCount);
      gross += BigInt(r.grossCents);
      refund += BigInt(r.refundCents);
      net += BigInt(r.netCents);
      const rating = Number(r.storeRating);
      if (rating > 0) {
        ratingSum += rating;
        ratingCount++;
      }
      if (r.topItemsJson) {
        for (const ti of r.topItemsJson) {
          const existing = topMap.get(ti.productId);
          if (existing) {
            existing.qty += ti.qty;
            existing.grossCents = String(BigInt(existing.grossCents) + BigInt(ti.grossCents));
          } else {
            topMap.set(ti.productId, { ...ti });
          }
        }
      }
    }

    const topItems = [...topMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
    return {
      range: dto.range ?? 'TODAY',
      orderCount,
      grossCents: gross.toString(),
      refundCents: refund.toString(),
      netCents: net.toString(),
      storeRating: ratingCount > 0 ? (ratingSum / ratingCount).toFixed(2) : '0.00',
      topItems,
    };
  }
}
