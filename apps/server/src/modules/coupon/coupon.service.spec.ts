import { UnprocessableEntityException } from '@nestjs/common';
import type { EntityManager, Repository } from 'typeorm';

import type { CouponLock } from '../../database/entities';

import { CouponService } from './coupon.service';

/**
 * 重写后:CouponService 操作 user_coupon + coupon_lock,接受 EntityManager。
 * 这里用 mock em + 内存数组模拟 update/insert/find 行为。
 */
describe('CouponService(订单链路 锁/释/消)', () => {
  let svc: CouponService;
  let locks: CouponLock[];
  let userCoupons: Array<{
    userCouponId: string;
    customerId: string;
    status: string;
    orderId?: string | null;
    usedAt?: string | null;
  }>;

  // mock 内部:em.getRepository(Entity) 返回对应的 repo
  function buildEm(): EntityManager {
    const couponLockRepoMock = {
      find: jest.fn(async (cond: { where: { orderId: string; status: string } }) =>
        locks.filter((l) => l.orderId === cond.where.orderId && l.status === cond.where.status),
      ),
      update: jest.fn(async (criteria: Record<string, unknown>, patch: Record<string, unknown>) => {
        let affected = 0;
        for (const l of locks) {
          if (Object.entries(criteria).every(([k, v]) => (l as unknown as Record<string, unknown>)[k] === v)) {
            Object.assign(l, patch);
            affected++;
          }
        }
        return { affected, raw: [] };
      }),
      insert: jest.fn(async (row: Partial<CouponLock>) => {
        locks.push({ ...row, couponLockId: String(locks.length + 1) } as CouponLock);
        return { identifiers: [{ couponLockId: String(locks.length) }], generatedMaps: [], raw: [] };
      }),
    };
    const userCouponRepoMock = {
      createQueryBuilder: jest.fn(() => {
        const state: { set?: Record<string, unknown>; whereParams?: Record<string, unknown> } = {};
        const qb: Record<string, unknown> = {};
        Object.assign(qb, {
          update: () => qb,
          set: (v: Record<string, unknown>) => {
            state.set = v;
            return qb;
          },
          where: (_sql: string, p: Record<string, unknown>) => {
            state.whereParams = p;
            return qb;
          },
          execute: async () => {
            const params = state.whereParams ?? {};
            let affected = 0;
            for (const uc of userCoupons) {
              if (uc.userCouponId === params.id && uc.customerId === params.cid && uc.status === params.s) {
                Object.assign(uc, state.set);
                affected++;
              }
            }
            return { affected, raw: [] };
          },
        });
        return qb;
      }),
      update: jest.fn(async (criteria: Record<string, unknown>, patch: Record<string, unknown>) => {
        let affected = 0;
        for (const uc of userCoupons) {
          if (Object.entries(criteria).every(([k, v]) => (uc as Record<string, unknown>)[k] === v)) {
            Object.assign(uc, patch);
            affected++;
          }
        }
        return { affected, raw: [] };
      }),
    };
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getRepository: (entity: any): unknown => {
        if (entity?.name === 'CouponLock') return couponLockRepoMock;
        return userCouponRepoMock;
      },
    } as unknown as EntityManager;
  }

  beforeEach(() => {
    locks = [];
    userCoupons = [{ userCouponId: 'UC1', customerId: '10001', status: 'UNUSED', orderId: null, usedAt: null }];
    svc = new CouponService({} as unknown as Repository<CouponLock>);
  });

  describe('lockCoupons', () => {
    it('空 userCouponId → 无操作', async () => {
      const em = buildEm();
      await expect(svc.lockCoupons(em, '700001', '', '10001')).resolves.toBeUndefined();
      expect(locks).toHaveLength(0);
    });

    it('UNUSED 券 → 转 USED + 写 coupon_lock', async () => {
      const em = buildEm();
      await svc.lockCoupons(em, '700001', 'UC1', '10001');
      expect(userCoupons[0]!.status).toBe('USED');
      expect(userCoupons[0]!.orderId).toBe('700001');
      expect(locks).toHaveLength(1);
      expect(locks[0]!.couponId).toBe('UC1');
      expect(locks[0]!.status).toBe('active');
    });

    it('已使用券再 lock → COUPON_NOT_AVAILABLE', async () => {
      userCoupons[0]!.status = 'USED';
      const em = buildEm();
      await expect(svc.lockCoupons(em, '700002', 'UC1', '10001')).rejects.toThrow(UnprocessableEntityException);
      expect(locks).toHaveLength(0);
    });

    it('归属不符 → COUPON_NOT_AVAILABLE', async () => {
      const em = buildEm();
      await expect(svc.lockCoupons(em, '700001', 'UC1', 'OTHER')).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('releaseCoupons', () => {
    it('回滚:lock active→released + user_coupon USED→UNUSED', async () => {
      // 先 lock
      const em = buildEm();
      await svc.lockCoupons(em, '700001', 'UC1', '10001');
      expect(userCoupons[0]!.status).toBe('USED');

      // 再 release
      const n = await svc.releaseCoupons(em, '700001');
      expect(n).toBe(1);
      expect(locks[0]!.status).toBe('released');
      expect(userCoupons[0]!.status).toBe('UNUSED');
    });

    it('无 active lock → 返 0', async () => {
      const em = buildEm();
      const n = await svc.releaseCoupons(em, 'unknown');
      expect(n).toBe(0);
    });
  });

  describe('consumeCoupons', () => {
    it('lock active→consumed,user_coupon 保持 USED', async () => {
      const em = buildEm();
      await svc.lockCoupons(em, '700001', 'UC1', '10001');
      const n = await svc.consumeCoupons(em, '700001');
      expect(n).toBe(1);
      expect(locks[0]!.status).toBe('consumed');
      expect(userCoupons[0]!.status).toBe('USED');
    });
  });
});
