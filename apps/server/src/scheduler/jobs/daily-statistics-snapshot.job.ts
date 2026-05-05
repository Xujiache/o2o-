import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';

import { FoodOrder, MerchantStatisticsSnapshot, OrderReview, Store } from '../../database/entities';
import { DistributedLockService } from '../distributed-lock.service';

import { BaseJob } from './base-job';

/**
 * Stage 7 — 每日 02:30 生成前一日商家经营快照(merchant_statistics_snapshot)。
 * 聚合 order_count / gross / refund / net + store_rating(过去 30 天评价均分)。
 * 唯一约束 (storeId, snapshotDate) 兜底重复跑。
 */
@Injectable()
export class DailyStatisticsSnapshotJob extends BaseJob {
  readonly name = 'daily-statistics-snapshot';
  protected override lockTtlMs = 60 * 60 * 1000;

  constructor(
    @InjectRepository(MerchantStatisticsSnapshot)
    private readonly snapshotRepo: Repository<MerchantStatisticsSnapshot>,
    @InjectRepository(FoodOrder) private readonly orderRepo: Repository<FoodOrder>,
    @InjectRepository(OrderReview) private readonly reviewRepo: Repository<OrderReview>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
    protected readonly lock: DistributedLockService,
  ) {
    super();
  }

  @Cron('0 30 2 * * *', { name: 'daily-statistics-snapshot' })
  async tick(): Promise<void> {
    await this.run();
  }

  async do(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const periodStart = yesterday.getTime();
    const periodEnd = today.getTime() - 1;
    const snapshotDate = Number(
      `${yesterday.getFullYear()}${(yesterday.getMonth() + 1).toString().padStart(2, '0')}${yesterday.getDate().toString().padStart(2, '0')}`,
    );

    const orders = await this.orderRepo.find({
      where: { createdAt: Between(String(periodStart), String(periodEnd)) },
    });
    if (!orders.length) {
      this.logger.log('[daily-statistics-snapshot] no orders to snapshot');
      return;
    }

    const byStore = new Map<string, FoodOrder[]>();
    for (const o of orders) {
      const arr = byStore.get(o.storeId) ?? [];
      arr.push(o);
      byStore.set(o.storeId, arr);
    }

    const ratingSince = today.getTime() - 30 * 24 * 3600 * 1000;
    const recentReviews = await this.reviewRepo.find({
      where: { createdAt: Between(String(ratingSince), String(today.getTime() - 1)) },
    });
    const ratingByStore = new Map<string, { sum: number; count: number }>();
    for (const r of recentReviews) {
      const cur = ratingByStore.get(r.storeId) ?? { sum: 0, count: 0 };
      cur.sum += Number(r.rating);
      cur.count += 1;
      ratingByStore.set(r.storeId, cur);
    }

    const now = Date.now();
    for (const [storeId, list] of byStore.entries()) {
      const store = await this.storeRepo.findOne({ where: { storeId } });
      if (!store) continue;
      const existing = await this.snapshotRepo.findOne({ where: { storeId, snapshotDate } });
      if (existing) continue;

      let gross = 0n;
      let refund = 0n;
      for (const o of list) {
        gross += BigInt(o.payableAmount);
        if (o.payStatus === 'refunded') refund += BigInt(o.payableAmount);
      }
      const net = gross - refund;
      const ratingAgg = ratingByStore.get(storeId);
      const storeRating = ratingAgg && ratingAgg.count > 0 ? (ratingAgg.sum / ratingAgg.count).toFixed(2) : '0.00';

      try {
        await this.snapshotRepo.save(
          this.snapshotRepo.create({
            storeId,
            merchantId: store.merchantId,
            snapshotDate,
            orderCount: list.length,
            grossCents: gross.toString(),
            refundCents: refund.toString(),
            netCents: net.toString(),
            topItemsJson: null,
            storeRating,
            createdAt: String(now),
          }),
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.error(`[daily-statistics-snapshot] failed storeId=${storeId}: ${msg}`);
      }
    }
  }
}
