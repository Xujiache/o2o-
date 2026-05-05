import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Between, Repository } from 'typeorm';

import { MerchantSettlement, Store } from '../../database/entities';

import type { SettlementListItemVo, SettlementListQueryDto, SettlementListVo } from './merchant-settlement.dto';

@Injectable()
export class MerchantSettlementService {
  constructor(
    @InjectRepository(MerchantSettlement)
    private readonly settlementRepo: Repository<MerchantSettlement>,
    @InjectRepository(Store) private readonly storeRepo: Repository<Store>,
  ) {}

  private async resolveStoreOrThrow(merchantId: string): Promise<Store> {
    const store = await this.storeRepo.findOne({ where: { merchantId } });
    if (!store) throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'merchant has no store' });
    return store;
  }

  async list(merchantId: string, query: SettlementListQueryDto): Promise<SettlementListVo> {
    const store = await this.resolveStoreOrThrow(merchantId);
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { storeId: store.storeId };
    if (query.status) where.status = query.status;
    if (query.month) {
      const year = Number(query.month.substring(0, 4));
      const month = Number(query.month.substring(4, 6));
      const start = new Date(year, month - 1, 1).getTime();
      const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
      where.periodStart = Between(String(start), String(end));
    }

    const [rows, total] = await this.settlementRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: SettlementListItemVo[] = rows.map((r) => ({
      settlementId: r.merchantSettlementId,
      settlementNo: r.settlementNo,
      periodStart: Number(r.periodStart),
      periodEnd: Number(r.periodEnd),
      grossCents: r.grossCents,
      commissionCents: r.commissionCents,
      feeCents: r.feeCents,
      netCents: r.netCents,
      orderCount: Number(r.orderCount),
      status: r.status,
      createdAt: Number(r.createdAt),
    }));
    return { items, total, pageNo, pageSize };
  }
}
