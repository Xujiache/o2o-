import type { DashboardSnapshot } from '../../database/entities';

import { DashboardService } from './dashboard.service';

interface World {
  snapshots: DashboardSnapshot[];
  foodCount: number;
  errandCount: number;
  onlineRiderCount: number;
  exceptionCount: number;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const snapshotRepo: any = {
    findOne: jest.fn(async (opt: any) => {
      return (
        w.snapshots.find((s) => s.snapshotDate === opt.where.snapshotDate && s.cityCode === opt.where.cityCode) ?? null
      );
    }),
  };
  const foodRepo: any = { count: jest.fn(async () => w.foodCount) };
  const errandRepo: any = { count: jest.fn(async () => w.errandCount) };
  const riderStatusRepo: any = { count: jest.fn(async () => w.onlineRiderCount) };
  const riskRepo: any = { count: jest.fn(async () => w.exceptionCount) };
  return {
    svc: new DashboardService(snapshotRepo, foodRepo, errandRepo, riderStatusRepo, riskRepo),
  };
  /* eslint-enable */
}

describe('DashboardService', () => {
  it('overview: 命中 snapshot → 直接返', async () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const w: World = {
      snapshots: [
        {
          snapshotId: '1',
          snapshotDate: todayKey,
          cityCode: 'BJ',
          gmv: '1000000',
          orderCount: 100,
          activeUsers: 50,
          onlineRiders: 20,
          exceptionOrders: 2,
          createdAt: '1',
        } as DashboardSnapshot,
      ],
      foodCount: 0,
      errandCount: 0,
      onlineRiderCount: 0,
      exceptionCount: 0,
    };
    const { svc } = buildService(w);
    const r = await svc.overview({ cityCode: 'BJ' });
    expect(r.gmv).toBe('1000000');
    expect(r.orderCount).toBe(100);
  });

  it('overview: 无 snapshot → 实时聚合', async () => {
    const w: World = {
      snapshots: [],
      foodCount: 5,
      errandCount: 3,
      onlineRiderCount: 7,
      exceptionCount: 1,
    };
    const { svc } = buildService(w);
    const r = await svc.overview({ cityCode: 'ALL' });
    expect(r.orderCount).toBe(8);
    expect(r.onlineRiders).toBe(7);
    expect(r.exceptionOrders).toBe(1);
    expect(r.gmv).toBe('0');
  });

  it('overview: 无 cityCode 默认 ALL', async () => {
    const w: World = { snapshots: [], foodCount: 0, errandCount: 0, onlineRiderCount: 0, exceptionCount: 0 };
    const { svc } = buildService(w);
    const r = await svc.overview({});
    expect(r.orderCount).toBe(0);
  });
});
