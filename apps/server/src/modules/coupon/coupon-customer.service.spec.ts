import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { CouponRule, UserCoupon } from '../../database/entities';

import { CouponCustomerService } from './coupon-customer.service';

/**
 * mock 一个 typeorm createQueryBuilder 的最小子集 — 满足 service 的链式调用。
 * 返回值可在每个测试里覆盖 getManyAndCount / execute / getRawMany / getCount。
 */
function buildQbMock(
  opts: {
    manyAndCount?: [unknown[], number];
    rawMany?: unknown[];
    count?: number;
    affected?: number;
  } = {},
) {
  const qb: Record<string, unknown> = {};
  const chain = (): typeof qb => qb;
  Object.assign(qb, {
    where: chain,
    andWhere: chain,
    orderBy: chain,
    skip: chain,
    take: chain,
    offset: chain,
    limit: chain,
    select: chain,
    innerJoin: chain,
    update: chain,
    set: chain,
    clone: () => buildQbMock(opts),
    getManyAndCount: jest.fn(async () => opts.manyAndCount ?? [[], 0]),
    getRawMany: jest.fn(async () => opts.rawMany ?? []),
    getCount: jest.fn(async () => opts.count ?? 0),
    getManyAndRaw: jest.fn(async () => ({ entities: [], raw: [] })),
    execute: jest.fn(async () => ({ affected: opts.affected ?? 0, raw: [] })),
  });
  return qb;
}

describe('CouponCustomerService', () => {
  const now = 1_700_000_000_000;
  const activeRule = (overrides: Partial<CouponRule> = {}): CouponRule =>
    ({
      couponRuleId: '901',
      couponName: '满50减10',
      couponType: 'AMOUNT',
      bizType: 'FOOD',
      threshold: '5000',
      discount: '1000',
      totalStock: 100,
      remainStock: 50,
      validFrom: String(now - 86400_000),
      validTo: String(now + 86400_000),
      status: 'ACTIVE',
      createdBy: '1',
      createdAt: String(now - 86400_000),
      updatedAt: String(now),
      ...overrides,
    }) as CouponRule;

  let svc: CouponCustomerService;
  let ruleRepo: jest.Mocked<Repository<CouponRule>>;
  let userCouponRepo: jest.Mocked<Repository<UserCoupon>>;
  let dataSource: jest.Mocked<DataSource>;
  let txRuleRepo: jest.Mocked<Repository<CouponRule>>;
  let txUserCouponRepo: jest.Mocked<Repository<UserCoupon>>;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);

    ruleRepo = {
      createQueryBuilder: jest.fn(() => buildQbMock({ manyAndCount: [[activeRule()], 1] })),
    } as unknown as jest.Mocked<Repository<CouponRule>>;

    userCouponRepo = {
      find: jest.fn(async () => []),
      createQueryBuilder: jest.fn(() => buildQbMock({ count: 0, rawMany: [] })),
    } as unknown as jest.Mocked<Repository<UserCoupon>>;

    // 事务 inner repos
    txRuleRepo = {
      findOne: jest.fn(async () => activeRule()),
      createQueryBuilder: jest.fn(() => buildQbMock({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<CouponRule>>;
    txUserCouponRepo = {
      findOne: jest.fn(async () => null),
      create: jest.fn((p) => p as UserCoupon),
      save: jest.fn(async (r: UserCoupon) => ({ ...r, userCouponId: '5001' })),
    } as unknown as jest.Mocked<Repository<UserCoupon>>;

    const em = {
      getRepository: jest.fn((entity: unknown) => {
        if ((entity as { name?: string }).name === 'CouponRule') return txRuleRepo;
        return txUserCouponRepo;
      }),
    } as unknown as EntityManager;

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(em)),
    } as unknown as jest.Mocked<DataSource>;

    svc = new CouponCustomerService(ruleRepo, userCouponRepo, dataSource);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('listAvailable', () => {
    it('返回 ACTIVE/有库存/在效期的券,并标记 alreadyClaimed', async () => {
      (userCouponRepo.find as jest.Mock).mockResolvedValueOnce([{ couponRuleId: '901' } as UserCoupon]);
      const r = await svc.listAvailable('10001', {});
      expect(r.total).toBe(1);
      expect(r.items[0]!.couponRuleId).toBe('901');
      expect(r.items[0]!.alreadyClaimed).toBe(true);
    });

    it('未领取时 alreadyClaimed=false', async () => {
      (userCouponRepo.find as jest.Mock).mockResolvedValueOnce([]);
      const r = await svc.listAvailable('10001', {});
      expect(r.items[0]!.alreadyClaimed).toBe(false);
    });
  });

  describe('claim', () => {
    it('正常领取 → 返回 userCouponId + 扣减库存 + 写 user_coupon', async () => {
      const r = await svc.claim('10001', '901');
      expect(r.userCouponId).toBe('5001');
      expect(r.couponRuleId).toBe('901');
      expect(txRuleRepo.createQueryBuilder).toHaveBeenCalled();
      expect(txUserCouponRepo.save).toHaveBeenCalled();
    });

    it('券不存在 → COUPON_NOT_AVAILABLE', async () => {
      (txRuleRepo.findOne as jest.Mock).mockResolvedValueOnce(null);
      await expect(svc.claim('10001', 'nope')).rejects.toMatchObject({
        response: { detail: 'COUPON_NOT_AVAILABLE' },
      });
    });

    it('券非 ACTIVE → COUPON_NOT_AVAILABLE', async () => {
      (txRuleRepo.findOne as jest.Mock).mockResolvedValueOnce(activeRule({ status: 'DISABLED' }));
      await expect(svc.claim('10001', '901')).rejects.toThrow(UnprocessableEntityException);
    });

    it('已过期 → COUPON_NOT_AVAILABLE', async () => {
      (txRuleRepo.findOne as jest.Mock).mockResolvedValueOnce(activeRule({ validTo: String(now - 1) }));
      await expect(svc.claim('10001', '901')).rejects.toMatchObject({
        response: { detail: 'COUPON_NOT_AVAILABLE' },
      });
    });

    it('已领过 → ALREADY_CLAIMED', async () => {
      (txUserCouponRepo.findOne as jest.Mock).mockResolvedValueOnce({ userCouponId: '4900' } as UserCoupon);
      await expect(svc.claim('10001', '901')).rejects.toMatchObject({
        response: { detail: 'ALREADY_CLAIMED' },
      });
    });

    it('库存为 0(原子扣减 affected=0)→ STOCK_DEPLETED', async () => {
      (txRuleRepo.createQueryBuilder as jest.Mock).mockReturnValueOnce(buildQbMock({ affected: 0 }));
      await expect(svc.claim('10001', '901')).rejects.toMatchObject({
        response: { detail: 'STOCK_DEPLETED' },
      });
    });
  });

  describe('listMy', () => {
    it('返回带运行时 EXPIRED 计算的列表', async () => {
      const raws = [
        {
          uc_user_coupon_id: '5001',
          uc_customer_id: '10001',
          uc_coupon_rule_id: '901',
          uc_status: 'UNUSED',
          uc_order_id: null,
          uc_received_at: String(now - 1000),
          uc_used_at: null,
          r_coupon_name: '满50减10',
          r_coupon_type: 'AMOUNT',
          r_biz_type: 'FOOD',
          r_threshold: '5000',
          r_discount: '1000',
          r_valid_from: String(now - 86400_000),
          r_valid_to: String(now - 1), // 已过 valid_to
        },
      ];
      (userCouponRepo.createQueryBuilder as jest.Mock).mockReturnValue(buildQbMock({ count: 1, rawMany: raws }));
      const r = await svc.listMy('10001', {});
      expect(r.total).toBe(1);
      expect(r.items[0]!.status).toBe('EXPIRED');
    });

    it('UNUSED 在效期内 → status=UNUSED', async () => {
      const raws = [
        {
          uc_user_coupon_id: '5001',
          uc_customer_id: '10001',
          uc_coupon_rule_id: '901',
          uc_status: 'UNUSED',
          uc_order_id: null,
          uc_received_at: String(now - 1000),
          uc_used_at: null,
          r_coupon_name: '满50减10',
          r_coupon_type: 'AMOUNT',
          r_biz_type: 'FOOD',
          r_threshold: '5000',
          r_discount: '1000',
          r_valid_from: String(now - 86400_000),
          r_valid_to: String(now + 86400_000),
        },
      ];
      (userCouponRepo.createQueryBuilder as jest.Mock).mockReturnValue(buildQbMock({ count: 1, rawMany: raws }));
      const r = await svc.listMy('10001', {});
      expect(r.items[0]!.status).toBe('UNUSED');
    });
  });
});
