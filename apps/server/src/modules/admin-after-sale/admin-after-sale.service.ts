import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { AfterSale, AfterSaleEvidence } from '../../database/entities';

import type {
  AdminAfterSaleDetailVo,
  AdminAfterSaleListItemVo,
  AdminAfterSaleListVo,
  AdminAfterSaleQueryDto,
} from './admin-after-sale.dto';

function toListItem(a: AfterSale): AdminAfterSaleListItemVo {
  return {
    afterSaleId: a.afterSaleId,
    orderId: a.orderId,
    storeId: a.storeId,
    merchantId: a.merchantId,
    customerId: a.customerId,
    type: a.type,
    reason: a.reason,
    amountCents: a.amountCents,
    status: a.status,
    appliedAt: Number(a.appliedAt),
    merchantReviewAt: a.merchantReviewAt ? Number(a.merchantReviewAt) : null,
    createdAt: Number(a.createdAt),
  };
}

@Injectable()
export class AdminAfterSaleService {
  constructor(
    @InjectRepository(AfterSale) private readonly afterSaleRepo: Repository<AfterSale>,
    @InjectRepository(AfterSaleEvidence)
    private readonly evidenceRepo: Repository<AfterSaleEvidence>,
  ) {}

  async list(query: AdminAfterSaleQueryDto): Promise<AdminAfterSaleListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;

    const [rows, total] = await this.afterSaleRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map(toListItem), total, pageNo, pageSize };
  }

  async detail(afterSaleId: string): Promise<AdminAfterSaleDetailVo> {
    const a = await this.afterSaleRepo.findOne({ where: { afterSaleId } });
    if (!a) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'after-sale not found' });
    const evidences = await this.evidenceRepo.find({ where: { afterSaleId } });
    return {
      ...toListItem(a),
      merchantRejectReason: a.merchantRejectReason,
      completedAt: a.completedAt ? Number(a.completedAt) : null,
      evidenceFileIds: evidences.map((e) => e.fileId),
    };
  }
}
