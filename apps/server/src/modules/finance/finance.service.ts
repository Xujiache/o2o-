import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { RateRule } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import type {
  PatchRateRuleDto,
  RateRuleItemVo,
  RateRulePatchVo,
  RateRulesListVo,
  RateRulesQueryDto,
} from './finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(RateRule) private readonly repo: Repository<RateRule>,
    private readonly eventBus: DomainEventBus,
  ) {}

  /** 旧规则按 city+category 标 EXPIRED → 写新 PENDING/EFFECTIVE → emit RateRuleChanged */
  async patchRule(dto: PatchRateRuleDto, operatorAdminId: string): Promise<RateRulePatchVo> {
    const now = Date.now();
    const status: 'PENDING' | 'EFFECTIVE' = dto.effectiveAt <= now ? 'EFFECTIVE' : 'PENDING';

    // 标记旧规则 EXPIRED(同 city + category 维度,且当前为 EFFECTIVE)
    await this.repo.update(
      {
        cityCode: dto.cityCode,
        categoryId: dto.categoryId ?? IsNull(),
        status: 'EFFECTIVE',
      },
      { status: 'EXPIRED', updatedAt: String(now) },
    );

    const row = this.repo.create({
      cityCode: dto.cityCode,
      categoryId: dto.categoryId ?? null,
      merchantCommissionRate: dto.merchantCommissionRate,
      riderServiceFee: dto.riderServiceFee,
      withdrawFeeRate: dto.withdrawFeeRate,
      settlementCycle: dto.settlementCycle,
      effectiveAt: String(dto.effectiveAt),
      status,
      operatorAdminId,
      createdAt: String(now),
      updatedAt: String(now),
    });
    const saved = await this.repo.save(row);
    await this.eventBus.publish(
      EventName.RateRuleChanged,
      {
        rateRuleId: saved.rateRuleId,
        cityCode: saved.cityCode,
        categoryId: saved.categoryId,
        effectiveAt: dto.effectiveAt,
        operatorAdminId,
        changedAt: now,
      },
      { bizType: 'rate-rule', bizId: saved.rateRuleId },
    );
    return { ruleId: saved.rateRuleId, effectiveAt: dto.effectiveAt };
  }

  async list(q: RateRulesQueryDto): Promise<RateRulesListVo> {
    const pageNo = Math.max(1, q.pageNo ?? 1);
    const pageSize = Math.max(1, Math.min(100, q.pageSize ?? 20));
    const where: Record<string, unknown> = {};
    if (q.cityCode) where.cityCode = q.cityCode;
    if (q.status) where.status = q.status;
    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (pageNo - 1) * pageSize,
      take: pageSize,
    });
    const items: RateRuleItemVo[] = rows.map((r) => ({
      rateRuleId: r.rateRuleId,
      cityCode: r.cityCode,
      categoryId: r.categoryId,
      merchantCommissionRate: r.merchantCommissionRate,
      riderServiceFee: r.riderServiceFee,
      withdrawFeeRate: r.withdrawFeeRate,
      settlementCycle: r.settlementCycle,
      effectiveAt: Number(r.effectiveAt),
      status: r.status,
      createdAt: Number(r.createdAt),
    }));
    return { items, total, pageNo, pageSize };
  }
}
