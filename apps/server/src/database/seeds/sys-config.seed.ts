import type { DataSource } from 'typeorm';

import { SysConfig } from '../entities';

const NOW = Date.now().toString();

/**
 * Stage 0 系统参数种子(可被运维通过平台 Web 后续覆盖)
 * 来源:CONSENSUS § 5 + 全局状态机时效规则
 */
const ROWS: Array<{ key: string; value: string; description: string }> = [
  { key: 'throttle.default.ttl', value: '60', description: '限流时间窗口(秒)' },
  { key: 'throttle.default.limit', value: '60', description: '默认限流阈值(次/窗口)' },
  { key: 'order.takeaway.wait_pay_minutes', value: '15', description: '外卖订单待支付超时(分钟,自动关单)' },
  { key: 'order.takeaway.merchant_remind_minutes', value: '5', description: '外卖订单商家未接单提醒(分钟)' },
  {
    key: 'order.takeaway.merchant_cancel_minutes',
    value: '10',
    description: '外卖订单商家未接单自动取消(分钟,全额退款)',
  },
  { key: 'order.errand.price_increase_minutes', value: '3', description: '跑腿订单无人接单自动加价(分钟)' },
  { key: 'order.errand.cancel_minutes', value: '10', description: '跑腿订单无人接单自动取消(分钟,全额退款)' },
  { key: 'settlement.cycle_days', value: '1', description: '默认结算周期天数(T+N)' },
];

export async function seedSysConfig(ds: DataSource): Promise<number> {
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
