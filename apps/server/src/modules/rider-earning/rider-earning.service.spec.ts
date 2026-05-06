import type { RiderEarning } from '../../database/entities';

import { RiderEarningService } from './rider-earning.service';

interface World {
  earnings: RiderEarning[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    find: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      let matched = w.earnings.filter((e) => {
        if (where.riderId && e.riderId !== where.riderId) return false;
        if (where.settleDate?._type === 'between') {
          const v = Number(e.settleDate);
          if (v < Number(where.settleDate._value[0]) || v > Number(where.settleDate._value[1])) return false;
        }
        return true;
      });
      if (opt.order?.settleDate === 'DESC')
        matched = [...matched].sort((a, b) => Number(b.settleDate) - Number(a.settleDate));
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return matched.slice(skip, skip + take);
    }),
  };
  return { svc: new RiderEarningService(repo) };
  /* eslint-enable */
}

describe('RiderEarningService', () => {
  it('查询多日聚合', async () => {
    const w: World = {
      earnings: [
        {
          riderEarningId: '1',
          riderId: '30001',
          settleDate: 20260505,
          orderCount: 10,
          baseAmount: '5000',
          distanceAmount: '500',
          timelyBonus: '200',
          rewardAmount: '300',
          deductAmount: '50',
          totalAmount: '5950',
          status: 'PENDING',
        } as RiderEarning,
        {
          riderEarningId: '2',
          riderId: '30001',
          settleDate: 20260506,
          orderCount: 8,
          baseAmount: '4000',
          distanceAmount: '400',
          timelyBonus: '100',
          rewardAmount: '0',
          deductAmount: '0',
          totalAmount: '4500',
          status: 'PENDING',
        } as RiderEarning,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.query('30001', {});
    expect(r.totalIncome).toBe('10450');
    expect(r.orderCount).toBe(18);
    expect(r.items.length).toBe(2);
    expect(r.items[0]!.settleDate).toBe(20260506);
  });

  it('rider 数据归属过滤', async () => {
    const w: World = {
      earnings: [
        {
          riderId: '99999',
          riderEarningId: '1',
          settleDate: 20260505,
          orderCount: 1,
          totalAmount: '0',
          baseAmount: '0',
          distanceAmount: '0',
          timelyBonus: '0',
          rewardAmount: '0',
          deductAmount: '0',
          status: 'PENDING',
        } as RiderEarning,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.query('30001', {});
    expect(r.items.length).toBe(0);
  });

  it('日期范围过滤', async () => {
    const w: World = {
      earnings: [
        {
          riderId: '30001',
          riderEarningId: '1',
          settleDate: 20260501,
          totalAmount: '100',
          orderCount: 1,
          baseAmount: '0',
          distanceAmount: '0',
          timelyBonus: '0',
          rewardAmount: '0',
          deductAmount: '0',
          status: 'PENDING',
        } as RiderEarning,
        {
          riderId: '30001',
          riderEarningId: '2',
          settleDate: 20260510,
          totalAmount: '200',
          orderCount: 1,
          baseAmount: '0',
          distanceAmount: '0',
          timelyBonus: '0',
          rewardAmount: '0',
          deductAmount: '0',
          status: 'PENDING',
        } as RiderEarning,
      ],
    };
    const { svc } = buildService(w);
    const r = await svc.query('30001', { fromDate: 20260505, toDate: 20260515 });
    expect(r.items.length).toBe(1);
    expect(r.items[0]!.totalAmount).toBe('200');
  });

  it('空结果返回 0 总额', async () => {
    const { svc } = buildService({ earnings: [] });
    const r = await svc.query('30001', {});
    expect(r.totalIncome).toBe('0');
    expect(r.items.length).toBe(0);
  });
});
