import { Between, In, LessThanOrEqual } from 'typeorm';

import type { MerchantLicense, MerchantPromotion, Product } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { DistributedLockService } from '../distributed-lock.service';

import { LicenseExpiryReminderJob } from './license-expiry-reminder.job';
import { PromoEndJob } from './promo-end.job';
import { PromoStartJob } from './promo-start.job';
import { SoldOutAutoOffShelfJob } from './sold-out-auto-off-shelf.job';
import { StockAlertScanJob } from './stock-alert-scan.job';

class MockLock {
  private held = false;
  async acquire(): Promise<string | null> {
    if (this.held) return null;
    this.held = true;
    return 'tok';
  }
  async release(): Promise<void> {
    this.held = false;
  }
}

describe('LicenseExpiryReminderJob', () => {
  it('扫 7 天内到期资质 + warn 日志', async () => {
    const repo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { applicationId: '1', licenseType: 'business_license', expiryDate: '2026-05-10' } as MerchantLicense,
        ]),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new LicenseExpiryReminderJob(repo as never, lock);
    const r = await job.run();
    expect(r.executed).toBe(true);
    expect(repo.find).toHaveBeenCalledWith({
      where: { expiryDate: Between(expect.any(String), expect.any(String)) },
      take: 200,
    });
  });

  it('两实例并发只一个跑', async () => {
    const repo = { find: jest.fn().mockResolvedValue([]) };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new LicenseExpiryReminderJob(repo as never, lock);
    const b = new LicenseExpiryReminderJob(repo as never, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

describe('StockAlertScanJob', () => {
  it('扫低库存 product → 发 StockLow', async () => {
    const fakeProducts: Partial<Product>[] = [
      { productId: '1', storeId: '201', stock: 3, stockAlertThreshold: 5 },
      { productId: '2', storeId: '201', stock: 1, stockAlertThreshold: 5 },
    ];
    const repo = { find: jest.fn().mockResolvedValue(fakeProducts) };
    const events: Array<{ name: string }> = [];
    const bus = {
      publish: jest.fn(async (name: string) => {
        events.push({ name });
        return { eventId: 'evt' };
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new StockAlertScanJob(repo as never, bus as unknown as DomainEventBus, lock);
    await job.run();
    expect(events.filter((e) => e.name === EventName.StockLow)).toHaveLength(2);
  });

  it('两实例并发只一个跑', async () => {
    const repo = { find: jest.fn().mockResolvedValue([]) };
    const bus = { publish: jest.fn() };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new StockAlertScanJob(repo as never, bus as unknown as DomainEventBus, lock);
    const b = new StockAlertScanJob(repo as never, bus as unknown as DomainEventBus, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

describe('PromoStartJob', () => {
  it('scheduled 时间到 → TX 改 product.price + status=active', async () => {
    const promo: Partial<MerchantPromotion> = {
      promoId: '1',
      promoType: 'time_limited',
      productIds: ['100'],
      status: 'scheduled',
      startTime: '0',
      endTime: String(Date.now() + 3600_000),
      rules: { discountType: 'percent', discountValue: 80 } as MerchantPromotion['rules'],
    };
    const product: Partial<Product> = { productId: '100', price: '1000' };
    const promoRepo = { find: jest.fn().mockResolvedValue([promo]) };
    const txProducts: Array<{ id: string; patch: Partial<Product> }> = [];
    const txPromos: Array<{ id: string; patch: Partial<MerchantPromotion> }> = [];
    const dataSource = {
      transaction: jest.fn(async (cb: (em: unknown) => Promise<unknown>) => {
        const em = {
          getRepository: (t: { name: string }) => {
            if (t.name === 'Product') {
              return {
                find: async () => [product],
                update: async (criteria: { productId: string }, patch: Partial<Product>) => {
                  txProducts.push({ id: criteria.productId, patch });
                  return { affected: 1 };
                },
              };
            }
            if (t.name === 'MerchantPromotion') {
              return {
                update: async (criteria: { promoId: string }, patch: Partial<MerchantPromotion>) => {
                  txPromos.push({ id: criteria.promoId, patch });
                  return { affected: 1 };
                },
              };
            }
            return {} as never;
          },
        };
        return cb(em);
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new PromoStartJob(promoRepo as never, dataSource as never, lock);
    await job.run();
    expect(promoRepo.find).toHaveBeenCalledWith({
      where: { status: 'scheduled', startTime: LessThanOrEqual(expect.any(String)) },
      take: 50,
    });
    expect(txProducts[0]?.patch.originalPrice).toBe('1000'); // 缓存原价
    expect(Number(txProducts[0]?.patch.price)).toBe(800); // 80%
    expect(txPromos[0]?.patch.status).toBe('active');
  });
});

describe('PromoEndJob', () => {
  it('active 时间到 → TX 还原 product.price + status=ended', async () => {
    const promo: Partial<MerchantPromotion> = {
      promoId: '2',
      promoType: 'time_limited',
      productIds: ['200'],
      status: 'active',
      startTime: '0',
      endTime: '100',
    };
    const product: Partial<Product> = { productId: '200', price: '800', originalPrice: '1000' };
    const promoRepo = { find: jest.fn().mockResolvedValue([promo]) };
    const txProducts: Array<{ patch: Partial<Product> }> = [];
    const txPromos: Array<{ patch: Partial<MerchantPromotion> }> = [];
    const dataSource = {
      transaction: jest.fn(async (cb: (em: unknown) => Promise<unknown>) => {
        const em = {
          getRepository: (t: { name: string }) => {
            if (t.name === 'Product') {
              return {
                find: async () => [product],
                update: async (_: unknown, patch: Partial<Product>) => {
                  txProducts.push({ patch });
                  return { affected: 1 };
                },
              };
            }
            if (t.name === 'MerchantPromotion') {
              return {
                update: async (_: unknown, patch: Partial<MerchantPromotion>) => {
                  txPromos.push({ patch });
                  return { affected: 1 };
                },
              };
            }
            return {} as never;
          },
        };
        return cb(em);
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new PromoEndJob(promoRepo as never, dataSource as never, lock);
    await job.run();
    expect(txProducts[0]?.patch.price).toBe('1000'); // 还原
    expect(txProducts[0]?.patch.originalPrice).toBeNull();
    expect(txPromos[0]?.patch.status).toBe('ended');
  });
});

describe('SoldOutAutoOffShelfJob', () => {
  it('扫 stock=0 + on_shelf → 改 sold_out', async () => {
    const updateExecuteSpy = jest.fn().mockResolvedValue({ affected: 3 });
    const repo = {
      createQueryBuilder: jest.fn(() => {
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.update = jest.fn(chain);
        qb.set = jest.fn(chain);
        qb.where = jest.fn(chain);
        qb.execute = updateExecuteSpy;
        return qb;
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const job = new SoldOutAutoOffShelfJob(repo as never, lock);
    await job.run();
    expect(updateExecuteSpy).toHaveBeenCalled();
  });

  it('两实例并发只一个跑', async () => {
    const updateExecuteSpy = jest.fn().mockResolvedValue({ affected: 0 });
    const repo = {
      createQueryBuilder: () => ({
        update: () => ({
          set: () => ({
            where: () => ({ execute: updateExecuteSpy }),
          }),
        }),
      }),
    };
    const lock = new MockLock() as unknown as DistributedLockService;
    const a = new SoldOutAutoOffShelfJob(repo as never, lock);
    const b = new SoldOutAutoOffShelfJob(repo as never, lock);
    const [r1, r2] = await Promise.all([a.run(), b.run()]);
    expect([r1, r2].filter((r) => r.executed)).toHaveLength(1);
  });
});

// 防止 unused import 编译警告
const _types: Array<MerchantLicense | Product | MerchantPromotion> = [];
void _types;
const _typeorm: typeof In = In;
void _typeorm;
