import type { RateRule } from '../../database/entities';

import { FinanceService } from './finance.service';

interface World {
  rows: RateRule[];
  events: Array<{ name: string }>;
  updateCalls: number;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    create: jest.fn((p: any) => ({ ...p }) as RateRule),
    save: jest.fn(async (r: RateRule) => {
      const item = { ...r, rateRuleId: String(w.rows.length + 1) } as RateRule;
      w.rows.push(item);
      return item;
    }),
    update: jest.fn(async (_w: any, _p: any) => {
      w.updateCalls++;
      return { affected: 0 };
    }),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.rows.filter((r) => {
        if (where.cityCode && r.cityCode !== where.cityCode) return false;
        if (where.status && r.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  const eventBus: any = {
    publish: jest.fn(async (name: string) => {
      w.events.push({ name });
      return { eventId: 'e1' };
    }),
  };
  return { svc: new FinanceService(repo, eventBus) };
  /* eslint-enable */
}

describe('FinanceService', () => {
  it('patchRule: effectiveAt<=now → EFFECTIVE + emit + 旧规则 update', async () => {
    const w: World = { rows: [], events: [], updateCalls: 0 };
    const { svc } = buildService(w);
    const r = await svc.patchRule(
      {
        cityCode: 'BJ',
        categoryId: null,
        merchantCommissionRate: 500,
        riderServiceFee: '300',
        withdrawFeeRate: 50,
        settlementCycle: 'T1',
        effectiveAt: 1,
      },
      '1',
    );
    expect(r.ruleId).toBe('1');
    expect(w.rows[0]?.status).toBe('EFFECTIVE');
    expect(w.events[0]?.name).toBe('domain.rate-rule.changed');
    expect(w.updateCalls).toBe(1);
  });

  it('patchRule: effectiveAt 未来 → PENDING', async () => {
    const w: World = { rows: [], events: [], updateCalls: 0 };
    const { svc } = buildService(w);
    await svc.patchRule(
      {
        cityCode: 'SH',
        categoryId: '1',
        merchantCommissionRate: 100,
        riderServiceFee: '500',
        withdrawFeeRate: 10,
        settlementCycle: 'WEEKLY',
        effectiveAt: Date.now() + 86400000,
      },
      '1',
    );
    expect(w.rows[0]?.status).toBe('PENDING');
  });

  it('list: 按 cityCode 过滤', async () => {
    const w: World = {
      rows: [
        {
          rateRuleId: '1',
          cityCode: 'BJ',
          categoryId: null,
          merchantCommissionRate: 100,
          riderServiceFee: '300',
          withdrawFeeRate: 10,
          settlementCycle: 'T1',
          effectiveAt: '1',
          status: 'EFFECTIVE',
          operatorAdminId: '1',
          createdAt: '1',
          updatedAt: '1',
        } as unknown as RateRule,
      ],
      events: [],
      updateCalls: 0,
    };
    const { svc } = buildService(w);
    const r = await svc.list({ cityCode: 'BJ' });
    expect(r.total).toBe(1);
  });

  it('list: 空筛选返全部', async () => {
    const w: World = { rows: [], events: [], updateCalls: 0 };
    const { svc } = buildService(w);
    const r = await svc.list({});
    expect(r.total).toBe(0);
  });
});
