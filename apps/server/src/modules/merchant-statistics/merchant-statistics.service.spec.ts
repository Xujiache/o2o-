import { ForbiddenException } from '@nestjs/common';

import type { MerchantStatisticsSnapshot, Store } from '../../database/entities';

import { MerchantStatisticsService } from './merchant-statistics.service';

interface World {
  snapshots: MerchantStatisticsSnapshot[];
  stores: Store[];
}

function todayKey(): number {
  const d = new Date();
  return Number(
    `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`,
  );
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const snapshotRepo: any = {
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.snapshots.filter((s) => {
        if (where.storeId && s.storeId !== where.storeId) return false;
        if (where.snapshotDate) {
          const range: any = where.snapshotDate;
          const v = Number(s.snapshotDate);
          if (range._type === 'between') {
            const [from, to] = range._value;
            if (v < Number(from) || v > Number(to)) return false;
          }
        }
        return true;
      });
    }),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };
  const svc = new MerchantStatisticsService(snapshotRepo, storeRepo);
  return { svc };
  /* eslint-enable */
}

describe('MerchantStatisticsService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      snapshots: [
        {
          merchantStatisticsSnapshotId: '1',
          storeId: '20001',
          merchantId: '30001',
          snapshotDate: todayKey(),
          orderCount: 10,
          grossCents: '50000',
          refundCents: '2000',
          netCents: '48000',
          storeRating: '4.50',
          topItemsJson: [{ productId: 'p1', productName: '宫保鸡丁', qty: 5, grossCents: '15000' }],
          createdAt: String(Date.now()),
        } as MerchantStatisticsSnapshot,
      ],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
    };
  });

  it('TODAY range 返回今日聚合', async () => {
    const { svc } = buildService(w);
    const r = await svc.query('30001', { range: 'TODAY' });
    expect(r.orderCount).toBe(10);
    expect(r.grossCents).toBe('50000');
    expect(r.netCents).toBe('48000');
    expect(r.storeRating).toBe('4.50');
    expect(r.topItems[0]!.productId).toBe('p1');
  });

  it('无 store 抛 FORBIDDEN', async () => {
    w.stores = [];
    const { svc } = buildService(w);
    await expect(svc.query('30001', {})).rejects.toThrow(ForbiddenException);
  });

  it('空快照返回 0', async () => {
    w.snapshots = [];
    const { svc } = buildService(w);
    const r = await svc.query('30001', { range: 'TODAY' });
    expect(r.orderCount).toBe(0);
    expect(r.grossCents).toBe('0');
    expect(r.storeRating).toBe('0.00');
  });
});
