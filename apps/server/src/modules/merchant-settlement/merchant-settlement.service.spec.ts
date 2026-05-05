import { ForbiddenException } from '@nestjs/common';

import type { MerchantSettlement, Store } from '../../database/entities';

import { MerchantSettlementService } from './merchant-settlement.service';

interface World {
  settlements: MerchantSettlement[];
  stores: Store[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const settlementRepo: any = {
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.settlements.filter((s) => {
        if (where.storeId && s.storeId !== where.storeId) return false;
        if (where.status && s.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };
  const svc = new MerchantSettlementService(settlementRepo, storeRepo);
  return { svc };
  /* eslint-enable */
}

describe('MerchantSettlementService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      settlements: [
        {
          merchantSettlementId: '900001',
          settlementNo: 'S20260506000001',
          merchantId: '30001',
          storeId: '20001',
          periodStart: String(Date.now() - 86400000),
          periodEnd: String(Date.now() - 1),
          grossCents: '50000',
          commissionCents: '2500',
          feeCents: '300',
          netCents: '47200',
          orderCount: 10,
          refundCount: 0,
          status: 'PENDING',
          createdAt: String(Date.now()),
          updatedAt: String(Date.now()),
        } as MerchantSettlement,
      ],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
    };
  });

  it('list 返回商家自己的结算单', async () => {
    const { svc } = buildService(w);
    const r = await svc.list('30001', { pageNo: 1, pageSize: 20 });
    expect(r.total).toBe(1);
    expect(r.items[0]!.settlementNo).toBe('S20260506000001');
    expect(r.items[0]!.netCents).toBe('47200');
  });

  it('status 过滤生效', async () => {
    const { svc } = buildService(w);
    const r = await svc.list('30001', { status: 'PAID' });
    expect(r.total).toBe(0);
  });

  it('无 store 抛 FORBIDDEN', async () => {
    w.stores = [];
    const { svc } = buildService(w);
    await expect(svc.list('30001', {})).rejects.toThrow(ForbiddenException);
  });
});
