import { NotFoundException } from '@nestjs/common';

import type { MerchantSettlement } from '../../database/entities';

import { AdminSettlementService } from './admin-settlement.service';

interface World {
  settlements: MerchantSettlement[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const settlementRepo: any = {
    findOne: jest.fn(
      async (opt: any) => w.settlements.find((s) => s.merchantSettlementId === opt.where.merchantSettlementId) ?? null,
    ),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.settlements.filter((s) => {
        if (where.status && s.status !== where.status) return false;
        if (where.storeId && s.storeId !== where.storeId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new AdminSettlementService(settlementRepo) };
  /* eslint-enable */
}

describe('AdminSettlementService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      settlements: [
        {
          merchantSettlementId: '900001',
          settlementNo: 'S1',
          storeId: '20001',
          merchantId: '30001',
          periodStart: '0',
          periodEnd: '0',
          grossCents: '50000',
          commissionCents: '2500',
          feeCents: '300',
          netCents: '47200',
          orderCount: 10,
          refundCount: 0,
          status: 'PENDING',
          completedAt: null,
          createdAt: '0',
          updatedAt: '0',
        } as MerchantSettlement,
      ],
    };
  });

  it('list 返回所有 + status 过滤', async () => {
    const { svc } = buildService(w);
    expect((await svc.list({})).total).toBe(1);
    expect((await svc.list({ status: 'PAID' })).total).toBe(0);
  });

  it('detail 返回单条', async () => {
    const { svc } = buildService(w);
    const r = await svc.detail('900001');
    expect(r.netCents).toBe('47200');
  });

  it('detail 不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.detail('999')).rejects.toThrow(NotFoundException);
  });
});
