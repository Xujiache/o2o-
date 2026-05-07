import type { DataSource } from 'typeorm';

import { PointsRule, type PointsRuleBizType, type PointsRuleTrigger } from '../entities';

interface PointsRuleSeed {
  ruleName: string;
  bizType: PointsRuleBizType;
  triggerEvent: PointsRuleTrigger;
  points: number;
}

const RULES: PointsRuleSeed[] = [
  { ruleName: '外卖订单完成送积分', bizType: 'FOOD', triggerEvent: 'ORDER_COMPLETED', points: 10 },
  { ruleName: '跑腿订单完成送积分', bizType: 'ERRAND', triggerEvent: 'ORDER_COMPLETED', points: 10 },
];

export async function seedPointsRules(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(PointsRule);
  const now = String(Date.now());
  let count = 0;
  for (const row of RULES) {
    const existing = await repo.findOne({ where: { bizType: row.bizType, triggerEvent: row.triggerEvent } });
    if (existing) {
      existing.ruleName = row.ruleName;
      existing.points = row.points;
      existing.enabled = 1;
      existing.updatedAt = now;
      await repo.save(existing);
    } else {
      await repo.insert({
        ...row,
        enabled: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
    count++;
  }
  return count;
}
