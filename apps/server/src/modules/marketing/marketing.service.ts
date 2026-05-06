import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CouponRule } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type { CouponItemVo, CouponPublishVo, CouponsListVo, CouponsQueryDto, CreateCouponDto } from './marketing.dto';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(CouponRule) private readonly repo: Repository<CouponRule>,
    private readonly eventBus: DomainEventBus,
  ) {}

  async publishCoupon(dto: CreateCouponDto, operatorAdminId: string): Promise<CouponPublishVo> {
    if (dto.validTo <= dto.validFrom) {
      throw new BadRequestException('validTo must be greater than validFrom');
    }
    const now = Date.now();
    const status = dto.validFrom <= now ? 'ACTIVE' : 'DRAFT';
    const row = this.repo.create({
      couponName: dto.couponName,
      couponType: dto.couponType,
      bizType: dto.bizType,
      threshold: dto.threshold,
      discount: dto.discount,
      totalStock: dto.totalStock,
      remainStock: dto.totalStock,
      validFrom: String(dto.validFrom),
      validTo: String(dto.validTo),
      status,
      createdBy: operatorAdminId,
      createdAt: String(now),
      updatedAt: String(now),
    });
    const saved = await this.repo.save(row);
    await this.eventBus.publish(
      EventName.CouponPublished,
      {
        couponRuleId: saved.couponRuleId,
        couponName: saved.couponName,
        bizType: saved.bizType,
        totalStock: saved.totalStock,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
        publishedAt: now,
      },
      { bizType: 'coupon', bizId: saved.couponRuleId },
    );
    return { couponRuleId: saved.couponRuleId, status: saved.status };
  }

  async list(q: CouponsQueryDto): Promise<CouponsListVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (q.status) where.status = q.status;
    if (q.bizType) where.bizType = q.bizType;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const items: CouponItemVo[] = rows.map((r) => ({
      couponRuleId: r.couponRuleId,
      couponName: r.couponName,
      couponType: r.couponType,
      bizType: r.bizType,
      threshold: r.threshold,
      discount: r.discount,
      totalStock: r.totalStock,
      remainStock: r.remainStock,
      validFrom: Number(r.validFrom),
      validTo: Number(r.validTo),
      status: r.status,
      createdAt: Number(r.createdAt),
    }));
    return { items, total, pageNo, pageSize };
  }
}
