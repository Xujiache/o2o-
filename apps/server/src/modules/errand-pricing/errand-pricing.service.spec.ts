import { NotFoundException } from '@nestjs/common';

import type { ErrandPricing } from '../../database/entities';

import { ErrandPricingService } from './errand-pricing.service';

const RULE_GLOBAL: ErrandPricing = {
  errandPricingId: '1',
  cityCode: 'GLOBAL',
  baseFee: '500',
  distanceFeePerKm: '50',
  urgentStandardFee: '0',
  urgentFastFee: '500',
  urgentExpressFee: '1000',
  weightExtraPerKg: '50',
  minDistanceMeters: 0,
  enabled: 1,
  createdAt: '0',
  updatedAt: '0',
};

const RULE_BJ: ErrandPricing = {
  ...RULE_GLOBAL,
  errandPricingId: '2',
  cityCode: 'BJ',
  baseFee: '800',
};

function buildService(rules: ErrandPricing[]) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findOne: jest.fn(async (opt: any) => {
      const code = opt?.where?.cityCode;
      const enabled = opt?.where?.enabled;
      return rules.find((r) => r.cityCode === code && (enabled == null || r.enabled === enabled)) ?? null;
    }),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ErrandPricingService(repo);
}

describe('ErrandPricingService.calc', () => {
  it('GLOBAL 规则 / standard 加急 / 1 km / 0 kg = 500 + 50*1 + 0 = 550', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ distanceMeters: 1000, urgentLevel: 'standard' });
    expect(r.baseFee).toBe('500');
    expect(r.distanceFee).toBe('50');
    expect(r.urgentFee).toBe('0');
    expect(r.payableAmount).toBe('550');
  });

  it('fast 加急 = +500', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ distanceMeters: 0, urgentLevel: 'fast' });
    expect(r.urgentFee).toBe('500');
    expect(r.payableAmount).toBe('1000'); // 500 base + 0 distance + 500 urgent
  });

  it('express 加急 = +1000', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ distanceMeters: 0, urgentLevel: 'express' });
    expect(r.urgentFee).toBe('1000');
    expect(r.payableAmount).toBe('1500');
  });

  it('weightKg 3 kg = 加 50*3 = 150 分(并入 urgentFee 字段)', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ distanceMeters: 0, urgentLevel: 'standard', weightKg: 3 });
    expect(r.urgentFee).toBe('150');
    expect(r.payableAmount).toBe('650');
  });

  it('weight 0 / null / 负数 不加价', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r1 = await svc.calc({ distanceMeters: 0, urgentLevel: 'standard', weightKg: 0 });
    expect(r1.urgentFee).toBe('0');
    const r2 = await svc.calc({ distanceMeters: 0, urgentLevel: 'standard', weightKg: null });
    expect(r2.urgentFee).toBe('0');
    const r3 = await svc.calc({ distanceMeters: 0, urgentLevel: 'standard', weightKg: -2 });
    expect(r3.urgentFee).toBe('0');
  });

  it('距离 1500 m 走 2 km(向上取整)', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ distanceMeters: 1500, urgentLevel: 'standard' });
    expect(r.distanceFee).toBe('100');
  });

  it('cityCode 命中本地规则 BJ', async () => {
    const svc = buildService([RULE_GLOBAL, RULE_BJ]);
    const r = await svc.calc({ cityCode: 'BJ', distanceMeters: 0, urgentLevel: 'standard' });
    expect(r.baseFee).toBe('800');
  });

  it('cityCode 未命中 fallback GLOBAL', async () => {
    const svc = buildService([RULE_GLOBAL]);
    const r = await svc.calc({ cityCode: 'SH', distanceMeters: 0, urgentLevel: 'standard' });
    expect(r.baseFee).toBe('500');
  });

  it('GLOBAL 都没有 → NotFoundException', async () => {
    const svc = buildService([]);
    await expect(svc.calc({ distanceMeters: 0, urgentLevel: 'standard' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('minDistanceMeters 起步距离扣减 — 设 800m 起步,实际 1500m,有效 700m,1 km', async () => {
    const ruleStart: ErrandPricing = { ...RULE_GLOBAL, minDistanceMeters: 800 };
    const svc = buildService([ruleStart]);
    const r = await svc.calc({ distanceMeters: 1500, urgentLevel: 'standard' });
    // 1500-800=700 → ceil(700/1000)=1
    expect(r.distanceFee).toBe('50');
  });
});
