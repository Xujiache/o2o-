import type { RiskExceptionLog } from '../../database/entities';

import { RiskService } from './risk.service';

interface World {
  rows: RiskExceptionLog[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.rows.filter((r) => {
        if (where.status && r.status !== where.status) return false;
        if (where.exceptionType && r.exceptionType !== where.exceptionType) return false;
        if (where.bizType && r.bizType !== where.bizType) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new RiskService(repo) };
  /* eslint-enable */
}

describe('RiskService', () => {
  it('listExceptions: 多过滤维度', async () => {
    const w: World = {
      rows: [
        {
          logId: '1',
          exceptionType: 'DELIVERY_TIMEOUT',
          bizType: 'FOOD',
          bizOrderId: '510001',
          severity: 'HIGH',
          description: '配送超时',
          status: 'OPEN',
          handlerAdminId: null,
          handledAt: null,
          createdAt: '1',
        } as unknown as RiskExceptionLog,
        {
          logId: '2',
          exceptionType: 'DUPLICATE_REFUND',
          bizType: 'ERRAND',
          bizOrderId: '610001',
          severity: 'MEDIUM',
          description: '重复退款',
          status: 'HANDLED',
          handlerAdminId: '1',
          handledAt: '2',
          createdAt: '1',
        } as unknown as RiskExceptionLog,
      ],
    };
    const { svc } = buildService(w);
    const r1 = await svc.listExceptions({ status: 'OPEN' });
    expect(r1.total).toBe(1);
    const r2 = await svc.listExceptions({ exceptionType: 'DUPLICATE_REFUND' });
    expect(r2.total).toBe(1);
    const r3 = await svc.listExceptions({});
    expect(r3.total).toBe(2);
  });

  it('listExceptions: 空返空', async () => {
    const w: World = { rows: [] };
    const { svc } = buildService(w);
    const r = await svc.listExceptions({});
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
  });
});
