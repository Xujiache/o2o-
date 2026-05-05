import { NotFoundException } from '@nestjs/common';

import type { MerchantWithdrawal } from '../../database/entities';

import { AdminWithdrawalService } from './admin-withdrawal.service';

interface World {
  withdrawals: MerchantWithdrawal[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    findOne: jest.fn(
      async (opt: any) => w.withdrawals.find((x) => x.merchantWithdrawalId === opt.where.merchantWithdrawalId) ?? null,
    ),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.withdrawals.filter((x) => {
        if (where.status && x.status !== where.status) return false;
        if (where.storeId && x.storeId !== where.storeId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  return { svc: new AdminWithdrawalService(repo) };
  /* eslint-enable */
}

describe('AdminWithdrawalService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      withdrawals: [
        {
          merchantWithdrawalId: 'A1',
          withdrawalNo: 'W1',
          storeId: '20001',
          merchantId: '30001',
          amountCents: '100000',
          status: 'PENDING',
          submittedAt: '0',
          completedAt: null,
          failReason: null,
        } as MerchantWithdrawal,
      ],
    };
  });

  it('list 默认 + status 过滤', async () => {
    const { svc } = buildService(w);
    expect((await svc.list({})).total).toBe(1);
    expect((await svc.list({ status: 'COMPLETED' })).total).toBe(0);
  });

  it('detail 返回单条', async () => {
    const { svc } = buildService(w);
    const r = await svc.detail('A1');
    expect(r.amountCents).toBe('100000');
  });

  it('detail 不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.detail('999')).rejects.toThrow(NotFoundException);
  });
});
