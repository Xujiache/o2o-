import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiderViolation } from '../../database/entities';

import type { AdminViolationItemVo, AdminViolationsListVo, AdminViolationsQueryDto } from './admin-violations.dto';

@Injectable()
export class AdminViolationsService {
  constructor(@InjectRepository(RiderViolation) private readonly repo: Repository<RiderViolation>) {}

  async list(query: AdminViolationsQueryDto): Promise<AdminViolationsListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.riderId) where.riderId = query.riderId;

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: AdminViolationItemVo[] = rows.map((r) => ({
      violationId: r.riderViolationId,
      riderId: r.riderId,
      riderTaskId: r.riderTaskId,
      type: r.type,
      description: r.description,
      deductCents: r.deductCents,
      status: r.status,
      reportedAt: Number(r.reportedAt),
      decidedAt: r.decidedAt ? Number(r.decidedAt) : null,
      decision: r.decision,
    }));
    return { items, total, pageNo, pageSize };
  }
}
