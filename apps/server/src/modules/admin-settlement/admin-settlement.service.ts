import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { MerchantSettlement } from '../../database/entities';

import type { AdminSettlementListItemVo, AdminSettlementListVo, AdminSettlementQueryDto } from './admin-settlement.dto';

function toItem(r: MerchantSettlement): AdminSettlementListItemVo {
  return {
    settlementId: r.merchantSettlementId,
    settlementNo: r.settlementNo,
    storeId: r.storeId,
    merchantId: r.merchantId,
    periodStart: Number(r.periodStart),
    periodEnd: Number(r.periodEnd),
    grossCents: r.grossCents,
    commissionCents: r.commissionCents,
    feeCents: r.feeCents,
    netCents: r.netCents,
    orderCount: Number(r.orderCount),
    refundCount: Number(r.refundCount),
    status: r.status,
    completedAt: r.completedAt ? Number(r.completedAt) : null,
    createdAt: Number(r.createdAt),
  };
}

@Injectable()
export class AdminSettlementService {
  constructor(
    @InjectRepository(MerchantSettlement)
    private readonly settlementRepo: Repository<MerchantSettlement>,
  ) {}

  async list(query: AdminSettlementQueryDto): Promise<AdminSettlementListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;

    const [rows, total] = await this.settlementRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map(toItem), total, pageNo, pageSize };
  }

  async detail(id: string): Promise<AdminSettlementListItemVo> {
    const r = await this.settlementRepo.findOne({ where: { merchantSettlementId: id } });
    if (!r) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'settlement not found' });
    return toItem(r);
  }
}
