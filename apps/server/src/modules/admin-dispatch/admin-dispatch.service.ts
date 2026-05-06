import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import { Repository } from 'typeorm';

import { DispatchTask } from '../../database/entities';

import type {
  AdminDispatchDetailVo,
  AdminDispatchItemVo,
  AdminDispatchListVo,
  AdminDispatchQueryDto,
} from './admin-dispatch.dto';

function toItem(t: DispatchTask): AdminDispatchItemVo {
  return {
    dispatchTaskId: t.dispatchTaskId,
    bizType: t.bizType,
    bizOrderId: t.bizOrderId,
    bizTaskId: t.bizTaskId,
    acceptedRiderId: t.acceptedRiderId,
    status: t.status,
    retryCount: Number(t.retryCount),
    dispatchedAt: Number(t.dispatchedAt),
    timeoutAt: Number(t.timeoutAt),
    completedAt: t.completedAt ? Number(t.completedAt) : null,
  };
}

@Injectable()
export class AdminDispatchService {
  constructor(@InjectRepository(DispatchTask) private readonly repo: Repository<DispatchTask>) {}

  async list(query: AdminDispatchQueryDto): Promise<AdminDispatchListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.bizType) where.bizType = query.bizType;

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { dispatchedAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map(toItem), total, pageNo, pageSize };
  }

  async detail(id: string): Promise<AdminDispatchDetailVo> {
    const t = await this.repo.findOne({ where: { dispatchTaskId: id } });
    if (!t) {
      throw new NotFoundException({ code: ErrorCode.DATA_NOT_FOUND, message: 'dispatch task not found' });
    }
    return { ...toItem(t), candidateRiderIds: t.candidateRiderIds ?? [] };
  }
}
