import type { RiderAssessment } from '../../database/entities';

import { RiderAssessmentService } from './rider-assessment.service';

interface World {
  rows: RiderAssessment[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findOne: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.rows.find((r) => r.riderId === where.riderId && Number(r.period) === where.period) ?? null;
    }),
  };
  return { svc: new RiderAssessmentService(repo) };
  /* eslint-enable */
}

describe('RiderAssessmentService', () => {
  it('查询本月考核(无数据返回 0)', async () => {
    const { svc } = buildService({ rows: [] });
    const r = await svc.query('30001', {});
    expect(r.onTimeRate).toBe('0');
    expect(r.badges).toEqual([]);
  });

  it('查询指定 period', async () => {
    const w: World = {
      rows: [
        {
          riderId: '30001',
          period: 202605,
          onTimeRate: '0.9500',
          acceptRate: '0.8000',
          complaintRate: '0.0100',
          avgRating: '4.80',
          rankInCity: 5,
          badgesJson: [{ code: 'GOLD', label: '金牌骑手', awardedAt: 1 }],
        } as RiderAssessment,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.query('30001', { period: 202605 });
    expect(r.period).toBe(202605);
    expect(r.onTimeRate).toBe('0.9500');
    expect(r.rankInCity).toBe(5);
    expect(r.badges.length).toBe(1);
  });

  it('数据归属过滤(其他 rider 不可见)', async () => {
    const w: World = {
      rows: [
        {
          riderId: '99999',
          period: 202605,
          onTimeRate: '0.99',
          acceptRate: '0.99',
          complaintRate: '0',
          avgRating: '5.00',
          rankInCity: null,
          badgesJson: null,
        } as RiderAssessment,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.query('30001', { period: 202605 });
    expect(r.onTimeRate).toBe('0');
  });
});
