import type { RiderViolation } from '../../database/entities';

import { AdminViolationsService } from './admin-violations.service';

interface World {
  rows: RiderViolation[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.rows.filter((r) => {
        if (where.status && r.status !== where.status) return false;
        if (where.type && r.type !== where.type) return false;
        if (where.riderId && r.riderId !== where.riderId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new AdminViolationsService(repo) };
  /* eslint-enable */
}

describe('AdminViolationsService', () => {
  it('list 多过滤维度', async () => {
    const w: World = {
      rows: [
        {
          riderViolationId: '1',
          riderId: '30001',
          type: 'EXCEPTION',
          status: 'PENDING_PLATFORM',
          description: '客户拒收',
          deductCents: null,
          riderTaskId: 'RT1',
          reportedAt: '0',
          decidedAt: null,
          decision: null,
          createdAt: '0',
        } as RiderViolation,
      ],
    };
    const { svc } = buildService(w);
    expect((await svc.list({})).total).toBe(1);
    expect((await svc.list({ type: 'LATE' })).total).toBe(0);
    expect((await svc.list({ riderId: '30001' })).total).toBe(1);
    expect((await svc.list({ riderId: '99999' })).total).toBe(0);
  });
});
