import type { DataSource } from 'typeorm';

import { SysConfig } from '../entities';

const NOW = Date.now().toString();

/**
 * Stage 7 — 商家端订单售后结算 4 条 sys_config 配置。
 * 来源:DESIGN_阶段7.md § 3.3
 */
const ROWS: Array<{ key: string; value: string; description: string }> = [
  {
    key: 'merchant.withdrawal.limit',
    value: JSON.stringify({ single: 1000000, daily: 5000000 }),
    description: '商家提现单笔/单日限额(分),JSON {single, daily}',
  },
  {
    key: 'after_sale.window_days',
    value: '7',
    description: '用户申请售后窗口(天,以订单 DELIVERED 起算)',
  },
  {
    key: 'merchant.commission.rate',
    value: JSON.stringify({ food: 500 }),
    description: '商家佣金率(万分位,500=5%)',
  },
  {
    key: 'merchant.payment.fee_rate',
    value: '60',
    description: '支付通道费率(万分位,60=0.6%)',
  },
];

export async function seedStage7SysConfig(ds: DataSource): Promise<number> {
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
