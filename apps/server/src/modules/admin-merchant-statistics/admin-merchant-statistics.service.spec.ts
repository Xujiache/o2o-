import type { MerchantStatisticsSnapshot } from '../../database/entities';

import { AdminMerchantStatisticsService } from './admin-merchant-statistics.service';

interface World {
  snapshots: MerchantStatisticsSnapshot[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.snapshots.filter((s) => {
        if (where.snapshotDate && Number(s.snapshotDate) !== Number(where.snapshotDate)) return false;
        if (where.storeId && s.storeId !== where.storeId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new AdminMerchantStatisticsService(repo) };
  /* eslint-enable */
}

describe('AdminMerchantStatisticsService', () => {
  it('snapshotDate 默认为昨天', async () => {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yestKey = Number(
      `${yest.getFullYear()}${(yest.getMonth() + 1).toString().padStart(2, '0')}${yest.getDate().toString().padStart(2, '0')}`,
    );
    const w: World = {
      snapshots: [
        {
          merchantStatisticsSnapshotId: '1',
          storeId: '20001',
          merchantId: '30001',
          snapshotDate: yestKey,
          orderCount: 10,
          grossCents: '50000',
          refundCents: '0',
          netCents: '47500',
          storeRating: '4.50',
          createdAt: '0',
        } as MerchantStatisticsSnapshot,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.list({});
    expect(r.total).toBe(1);
    expect(r.items[0]!.snapshotDate).toBe(yestKey);
  });

  it('storeId 过滤生效', async () => {
    const w: World = {
      snapshots: [
        { merchantStatisticsSnapshotId: '1', storeId: '20001', snapshotDate: 20260505 } as MerchantStatisticsSnapshot,
      ],
    };
    const { svc } = buildService(w);
    expect((await svc.list({ snapshotDate: 20260505, storeId: '20002' })).total).toBe(0);
    expect((await svc.list({ snapshotDate: 20260505, storeId: '20001' })).total).toBe(1);
  });
});
