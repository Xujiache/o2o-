import { UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { CouponLock } from '../../database/entities';

import { CouponService } from './coupon.service';

describe('CouponService(stage 5 最小化)', () => {
  let svc: CouponService;
  let locks: CouponLock[];

  beforeEach(() => {
    locks = [
      {
        couponLockId: '1',
        orderId: '700001',
        couponId: 'C1',
        customerId: '10001',
        status: 'active',
      } as unknown as CouponLock,
    ];
    const repo = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: jest.fn(async (criteria: any, patch: any) => {
        const matched = locks.filter((l) => l.orderId === criteria.orderId && l.status === criteria.status);
        for (const m of matched) Object.assign(m, patch);
        return { affected: matched.length, raw: [] };
      }),
    } as unknown as jest.Mocked<Repository<CouponLock>>;
    svc = new CouponService(repo);
  });

  it('lockCoupons 任意非空 couponId → INVALID_PARAM(stage 5 防御)', async () => {
    await expect(svc.lockCoupons('700001', 'C1', '10001')).rejects.toThrow(UnprocessableEntityException);
  });

  it('lockCoupons 空 couponId → 静默返(无锁)', async () => {
    await expect(svc.lockCoupons('700001', '', '10001')).resolves.toBeUndefined();
  });

  it('releaseCoupons → active → released', async () => {
    const n = await svc.releaseCoupons('700001');
    expect(n).toBe(1);
    expect(locks[0]!.status).toBe('released');
  });

  it('consumeCoupons → active → consumed', async () => {
    const n = await svc.consumeCoupons('700001');
    expect(n).toBe(1);
    expect(locks[0]!.status).toBe('consumed');
  });
});
