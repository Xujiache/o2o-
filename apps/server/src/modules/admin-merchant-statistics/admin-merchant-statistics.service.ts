import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MerchantStatisticsSnapshot } from '../../database/entities';

import type {
  AdminMerchantStatisticsItemVo,
  AdminMerchantStatisticsListVo,
  AdminMerchantStatisticsQueryDto,
} from './admin-merchant-statistics.dto';

function yesterdayKey(): number {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return Number(
    `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`,
  );
}

@Injectable()
export class AdminMerchantStatisticsService {
  constructor(
    @InjectRepository(MerchantStatisticsSnapshot)
    private readonly snapshotRepo: Repository<MerchantStatisticsSnapshot>,
  ) {}

  async list(query: AdminMerchantStatisticsQueryDto): Promise<AdminMerchantStatisticsListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { snapshotDate: query.snapshotDate ?? yesterdayKey() };
    if (query.storeId) where.storeId = query.storeId;

    const [rows, total] = await this.snapshotRepo.findAndCount({
      where,
      order: { netCents: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const items: AdminMerchantStatisticsItemVo[] = rows.map((r) => ({
      snapshotId: r.merchantStatisticsSnapshotId,
      storeId: r.storeId,
      merchantId: r.merchantId,
      snapshotDate: Number(r.snapshotDate),
      orderCount: Number(r.orderCount),
      grossCents: r.grossCents,
      refundCents: r.refundCents,
      netCents: r.netCents,
      storeRating: r.storeRating,
    }));
    return { items, total, pageNo, pageSize };
  }
}
