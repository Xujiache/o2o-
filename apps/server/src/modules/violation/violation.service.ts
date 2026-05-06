import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RiderViolation } from '../../database/entities';

import type { ViolationItemVo, ViolationListQueryDto, ViolationListVo } from './violation.dto';

@Injectable()
export class ViolationService {
  constructor(@InjectRepository(RiderViolation) private readonly violationRepo: Repository<RiderViolation>) {}

  async list(riderId: string, query: ViolationListQueryDto): Promise<ViolationListVo> {
    const pageNo = Math.max(1, query.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));

    const where: Record<string, unknown> = { riderId };
    if (query.status) where.status = query.status;

    const [rows, total] = await this.violationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });

    const items: ViolationItemVo[] = rows.map((r) => ({
      violationId: r.riderViolationId,
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
