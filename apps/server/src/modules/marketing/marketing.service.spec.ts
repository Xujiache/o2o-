import type { CouponRule } from '../../database/entities';

import { MarketingService } from './marketing.service';

interface World {
  rows: CouponRule[];
  events: Array<{ name: string }>;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    create: jest.fn((p: any) => ({ ...p }) as CouponRule),
    save: jest.fn(async (r: CouponRule) => {
      if (!r.couponRuleId) {
        const item = { ...r, couponRuleId: String(w.rows.length + 1) } as CouponRule;
        w.rows.push(item);
        return item;
      }
      return r;
    }),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.rows.filter((r) => {
        if (where.status && r.status !== where.status) return false;
        if (where.bizType && r.bizType !== where.bizType) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
  };
  const eventBus: any = {
    publish: jest.fn(async (name: string) => {
      w.events.push({ name });
      return { eventId: 'e1' };
    }),
  };
  return { svc: new MarketingService(repo, eventBus) };
  /* eslint-enable */
}

describe('MarketingService', () => {
  it('publishCoupon: validFrom 已到 → ACTIVE + emit', async () => {
    const w: World = { rows: [], events: [] };
    const { svc } = buildService(w);
    const r = await svc.publishCoupon(
      {
        couponName: '满 50 减 10',
        couponType: 'AMOUNT',
        bizType: 'FOOD',
        threshold: '5000',
        discount: '1000',
        totalStock: 100,
        validFrom: 1,
        validTo: Date.now() + 86400000,
      },
      '1',
    );
    expect(r.status).toBe('ACTIVE');
    expect(r.couponRuleId).toBe('1');
    expect(w.events[0]?.name).toBe('domain.coupon.published');
  });

  it('publishCoupon: validFrom 未到 → DRAFT', async () => {
    const w: World = { rows: [], events: [] };
    const { svc } = buildService(w);
    const r = await svc.publishCoupon(
      {
        couponName: 'C',
        couponType: 'AMOUNT',
        bizType: 'ALL',
        threshold: '0',
        discount: '500',
        totalStock: 50,
        validFrom: Date.now() + 86400000,
        validTo: Date.now() + 172800000,
      },
      '1',
    );
    expect(r.status).toBe('DRAFT');
  });

  it('publishCoupon: validTo<=validFrom → BadRequest', async () => {
    const w: World = { rows: [], events: [] };
    const { svc } = buildService(w);
    await expect(
      svc.publishCoupon(
        {
          couponName: 'X',
          couponType: 'AMOUNT',
          bizType: 'FOOD',
          threshold: '0',
          discount: '500',
          totalStock: 1,
          validFrom: 100,
          validTo: 100,
        },
        '1',
      ),
    ).rejects.toThrow();
  });

  it('list: 按 bizType 过滤', async () => {
    const w: World = {
      rows: [
        {
          couponRuleId: '1',
          couponName: 'A',
          couponType: 'AMOUNT',
          bizType: 'FOOD',
          threshold: '0',
          discount: '100',
          totalStock: 10,
          remainStock: 10,
          validFrom: '1',
          validTo: '2',
          status: 'ACTIVE',
          createdBy: '1',
          createdAt: '1',
          updatedAt: '1',
        } as unknown as CouponRule,
        {
          couponRuleId: '2',
          couponName: 'B',
          couponType: 'AMOUNT',
          bizType: 'ERRAND',
          threshold: '0',
          discount: '100',
          totalStock: 10,
          remainStock: 10,
          validFrom: '1',
          validTo: '2',
          status: 'ACTIVE',
          createdBy: '1',
          createdAt: '1',
          updatedAt: '1',
        } as unknown as CouponRule,
      ],
      events: [],
    };
    const { svc } = buildService(w);
    const r = await svc.list({ bizType: 'FOOD' });
    expect(r.total).toBe(1);
  });
});
