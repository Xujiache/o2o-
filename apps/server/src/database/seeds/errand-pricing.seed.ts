import type { DataSource } from 'typeorm';

import { ErrandPricing } from '../entities';

const NOW = Date.now().toString();

/**
 * Stage 6 计价规则种子(全国默认 GLOBAL):
 * - 基础费 5 元(500 分)
 * - 距离费 0.5 元/km(50 分/km)
 * - 加急费 standard 0 / fast 5 元(500 分) / express 10 元(1000 分)
 * - 重量加价 0.5 元/kg(50 分/kg)
 * - 起步距离 0(< 0 视为同地址)
 */
export async function seedErrandPricing(ds: DataSource): Promise<number> {
  const repo = ds.getRepository(ErrandPricing);
  const existing = await repo.findOne({ where: { cityCode: 'GLOBAL' } });
  if (existing) {
    existing.baseFee = '500';
    existing.distanceFeePerKm = '50';
    existing.urgentStandardFee = '0';
    existing.urgentFastFee = '500';
    existing.urgentExpressFee = '1000';
    existing.weightExtraPerKg = '50';
    existing.minDistanceMeters = 0;
    existing.enabled = 1;
    existing.updatedAt = NOW;
    await repo.save(existing);
    return 1;
  }
  await repo.insert({
    cityCode: 'GLOBAL',
    baseFee: '500',
    distanceFeePerKm: '50',
    urgentStandardFee: '0',
    urgentFastFee: '500',
    urgentExpressFee: '1000',
    weightExtraPerKg: '50',
    minDistanceMeters: 0,
    enabled: 1,
    createdAt: NOW,
    updatedAt: NOW,
  });
  return 1;
}
