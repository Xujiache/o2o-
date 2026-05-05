import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { MerchantWithdrawal } from '../../database/entities';

import type { AdminWithdrawalListItemVo, AdminWithdrawalListVo, AdminWithdrawalQueryDto } from './admin-withdrawal.dto';

function toItem(r: MerchantWithdrawal): AdminWithdrawalListItemVo {
  return {
    withdrawalId: r.merchantWithdrawalId,
    withdrawalNo: r.withdrawalNo,
    storeId: r.storeId,
    merchantId: r.merchantId,
    amountCents: r.amountCents,
    status: r.status,
    submittedAt: Number(r.submittedAt),
    completedAt: r.completedAt ? Number(r.completedAt) : null,
    failReason: r.failReason,
  };
}

@Injectable()
export class AdminWithdrawalService {
  constructor(
    @InjectRepository(MerchantWithdrawal)
    private readonly withdrawalRepo: Repository<MerchantWithdrawal>,
  ) {}

  async list(query: AdminWithdrawalQueryDto): Promise<AdminWithdrawalListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;

    const [rows, total] = await this.withdrawalRepo.findAndCount({
      where,
      order: { submittedAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map(toItem), total, pageNo, pageSize };
  }

  async detail(id: string): Promise<AdminWithdrawalListItemVo> {
    const r = await this.withdrawalRepo.findOne({ where: { merchantWithdrawalId: id } });
    if (!r) throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'withdrawal not found' });
    return toItem(r);
  }
}
