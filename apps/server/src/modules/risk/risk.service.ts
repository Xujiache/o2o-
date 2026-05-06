import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiskExceptionLog } from '../../database/entities';

import type { RiskExceptionItemVo, RiskExceptionsListVo, RiskExceptionsQueryDto } from './risk.dto';

@Injectable()
export class RiskService {
  constructor(@InjectRepository(RiskExceptionLog) private readonly repo: Repository<RiskExceptionLog>) {}

  async listExceptions(q: RiskExceptionsQueryDto): Promise<RiskExceptionsListVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.exceptionType) where.exceptionType = q.exceptionType;
    if (q.bizType) where.bizType = q.bizType;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const items: RiskExceptionItemVo[] = rows.map((r) => ({
      logId: r.logId,
      exceptionType: r.exceptionType,
      bizType: r.bizType,
      bizOrderId: r.bizOrderId,
      severity: r.severity,
      description: r.description,
      status: r.status,
      handlerAdminId: r.handlerAdminId,
      handledAt: r.handledAt ? Number(r.handledAt) : null,
      createdAt: Number(r.createdAt),
    }));
    return { items, total, pageNo, pageSize };
  }
}
