import type { DataSource } from 'typeorm';

import { SysConfig } from '../entities';

const NOW = Date.now().toString();

/**
 * Stage 8 — 骑手端调度轨迹收益考核 4 条 sys_config 配置。
 * 来源:DESIGN_阶段8.md § 3.3
 */
const ROWS: Array<{ key: string; value: string; description: string }> = [
  {
    key: 'rider.withdrawal.limit',
    value: JSON.stringify({ single: 100000, daily: 1000000 }),
    description: '骑手提现单笔/单日限额(分),JSON {single, daily}',
  },
  {
    key: 'rider.earning.formula',
    value: JSON.stringify({ baseFood: 500, baseErrand: 300, perKmCents: 50, timelyBonus: 200 }),
    description: '骑手收益公式(分):baseFood/baseErrand 单笔基础酬劳 + perKmCents 每公里距离补贴 + timelyBonus 时效奖励',
  },
  {
    key: 'rider.assessment.thresholds',
    value: JSON.stringify({ onTimeRate: 0.9, acceptRate: 0.8, complaintRate: 0.05 }),
    description: '骑手考核阈值:准时率/接单率/投诉率',
  },
  {
    key: 'dispatch.timeout_seconds',
    value: '30',
    description: '派单超时秒数(超时进入重试)',
  },
];

export async function seedStage8SysConfig(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(SysConfig);
  for (const r of ROWS) {
    const existing = await repo.findOne({ where: { configKey: r.key } });
    if (existing) {
      existing.configValue = r.value;
      existing.description = r.description;
      existing.updatedAt = NOW;
      await repo.save(existing);
    } else {
      await repo.insert({
        configKey: r.key,
        configValue: r.value,
        scope: 'global',
        description: r.description,
        updatedAt: NOW,
      });
    }
  }
  return ROWS.length;
}
