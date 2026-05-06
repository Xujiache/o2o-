import type { RiderViolation } from '../../database/entities';

import { ViolationService } from './violation.service';

interface World {
  violations: RiderViolation[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.violations.filter((v) => {
        if (where.riderId && v.riderId !== where.riderId) return false;
        if (where.status && v.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new ViolationService(repo) };
  /* eslint-enable */
}

describe('ViolationService', () => {
  it('list 仅返回本骑手违规', async () => {
    const w: World = {
      violations: [
        {
          riderViolationId: '1',
          riderId: '30001',
          riderTaskId: 'RT1',
          type: 'EXCEPTION',
          description: '客户拒收',
          deductCents: null,
          status: 'PENDING_PLATFORM',
          reportedAt: '0',
          decidedAt: null,
          decision: null,
          createdAt: '0',
        } as RiderViolation,
        {
          riderViolationId: '2',
          riderId: '99999',
          type: 'LATE',
          description: 'x',
          status: 'CONFIRMED',
          reportedAt: '0',
          createdAt: '0',
        } as RiderViolation,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.list('30001', {});
    expect(r.total).toBe(1);
    expect(r.items[0]!.violationId).toBe('1');
  });

  it('status 过滤生效', async () => {
    const w: World = {
      violations: [
        {
          riderViolationId: '1',
          riderId: '30001',
          type: 'EXCEPTION',
          status: 'CONFIRMED',
          reportedAt: '0',
          createdAt: '0',
          description: 'x',
        } as RiderViolation,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.list('30001', { status: 'PENDING_PLATFORM' });
    expect(r.total).toBe(0);
  });

  it('空数据返回 0', async () => {
    const { svc } = buildService({ violations: [] });
    const r = await svc.list('30001', {});
    expect(r.total).toBe(0);
  });
});
