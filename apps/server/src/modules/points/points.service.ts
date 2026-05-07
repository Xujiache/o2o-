import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsWhere, Repository } from 'typeorm';

import { PointsRecord, PointsRule } from '../../database/entities';

import type {
  PointsOverviewVo,
  PointsRecordItemVo,
  PointsRecordsQueryDto,
  PointsRecordsVo,
  PointsRulesQueryDto,
  PointsRulesVo,
} from './points.dto';

@Injectable()
export class PointsService {
  constructor(
    @InjectRepository(PointsRule) private readonly ruleRepo: Repository<PointsRule>,
    @InjectRepository(PointsRecord) private readonly recordRepo: Repository<PointsRecord>,
  ) {}

  async overview(customerId: string): Promise<PointsOverviewVo> {
    const records = await this.recordRepo.find({ where: { customerId } });
    const totalEarned = records.filter((r) => r.points > 0).reduce((sum, r) => sum + r.points, 0);
    const totalUsed = records.filter((r) => r.points < 0).reduce((sum, r) => sum + Math.abs(r.points), 0);
    return {
      customerId,
      balance: totalEarned - totalUsed,
      totalEarned,
      totalUsed,
      expiringSoon: 0,
    };
  }

  async rules(query: PointsRulesQueryDto): Promise<PointsRulesVo> {
    const where: FindOptionsWhere<PointsRule> = { enabled: 1 };
    if (query.bizType) where.bizType = query.bizType;
    const rows = await this.ruleRepo.find({
      where,
      order: { bizType: 'ASC', triggerEvent: 'ASC', pointsRuleId: 'ASC' },
    });
    return {
      items: rows.map((r) => ({
        pointsRuleId: r.pointsRuleId,
        ruleName: r.ruleName,
        bizType: r.bizType,
        triggerEvent: r.triggerEvent,
        points: r.points,
      })),
    };
  }

  async records(customerId: string, query: PointsRecordsQueryDto): Promise<PointsRecordsVo> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
    const where: FindOptionsWhere<PointsRecord> = { customerId };
    if (query.bizType) where.bizType = query.bizType;

    const [rows, total] = await this.recordRepo.findAndCount({
      where,
      order: { createdAt: 'DESC', pointsRecordId: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      items: rows.map((r) => this.toRecordItem(r)),
      total,
      page,
      pageSize,
    };
  }

  private toRecordItem(record: PointsRecord): PointsRecordItemVo {
    return {
      pointsRecordId: record.pointsRecordId,
      changeType: record.changeType,
      bizType: record.bizType,
      bizOrderId: record.bizOrderId,
      points: record.points,
      balanceAfter: record.balanceAfter,
      remark: record.remark,
      createdAt: Number(record.createdAt),
    };
  }
}
