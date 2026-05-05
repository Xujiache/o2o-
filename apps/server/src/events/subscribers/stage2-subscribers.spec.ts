import type { DataSource, EntityManager } from 'typeorm';

import type { MerchantAccount, MerchantApplication, ProductCategory, Store } from '../../database/entities';

import { MerchantApprovedSubscriber } from './merchant-approved.subscriber';
import { MerchantSubmittedSubscriber } from './merchant-submitted.subscriber';
import { StockLowSubscriber } from './stock-low.subscriber';
import { StoreStatusChangedSubscriber } from './store-status-changed.subscriber';

describe('MerchantSubmittedSubscriber', () => {
  it('记录日志,不抛错', () => {
    const sub = new MerchantSubmittedSubscriber();
    expect(() => sub.handle({ merchantId: '1', applicationId: '100', submittedAt: Date.now() })).not.toThrow();
  });
});

describe('StoreStatusChangedSubscriber', () => {
  it('记录日志,不抛错', () => {
    const sub = new StoreStatusChangedSubscriber();
    expect(() =>
      sub.handle({
        storeId: '201',
        merchantId: '1',
        beforeStatus: 'online',
        afterStatus: 'offline',
        effectiveAt: Date.now(),
        operatorType: 'merchant',
      }),
    ).not.toThrow();
  });
});

describe('StockLowSubscriber', () => {
  it('记录日志,不抛错', () => {
    const sub = new StockLowSubscriber();
    expect(() => sub.handle({ productId: '100', storeId: '201', currentStock: 2, threshold: 5 })).not.toThrow();
  });
});

describe('MerchantApprovedSubscriber', () => {
  let merchants: MerchantAccount[];
  let apps: MerchantApplication[];
  let stores: Store[];
  let cats: ProductCategory[];
  let nextStoreId = 301;
  let nextCatId = 1;

  function makeFakeDataSource(): DataSource {
    return {
      transaction: async (cb: (em: EntityManager) => Promise<unknown>) => {
        const em = {
          getRepository: (target: unknown) => {
            const name = (target as { name?: string }).name;
            if (name === 'MerchantAccount') {
              return {
                findOne: async ({ where }: { where: Partial<MerchantAccount> }) =>
                  merchants.find((m) => m.merchantId === where.merchantId) ?? null,
                update: async (criteria: Partial<MerchantAccount>, patch: Partial<MerchantAccount>) => {
                  const m = merchants.find((x) => x.merchantId === criteria.merchantId);
                  if (m) Object.assign(m, patch);
                  return { affected: m ? 1 : 0 };
                },
              };
            }
            if (name === 'MerchantApplication') {
              return {
                findOne: async ({ where }: { where: Partial<MerchantApplication> }) =>
                  apps.find((a) => a.applicationId === where.applicationId) ?? null,
              };
            }
            if (name === 'Store') {
              return {
                create: (dto: Partial<Store>) => dto as Store,
                save: async (s: Store) => {
                  const saved = { ...s, storeId: String(nextStoreId++) };
                  stores.push(saved);
                  return saved;
                },
              };
            }
            if (name === 'ProductCategory') {
              return {
                insert: async (c: Partial<ProductCategory>) => {
                  cats.push({ ...c, categoryId: String(nextCatId++) } as ProductCategory);
                  return { identifiers: [] };
                },
              };
            }
            return {} as never;
          },
        } as unknown as EntityManager;
        return cb(em);
      },
    } as unknown as DataSource;
  }

  beforeEach(() => {
    merchants = [
      { merchantId: '1', mobile: '13800000001', accountStatus: 'active', approvedStoreId: null } as MerchantAccount,
    ];
    apps = [
      {
        applicationId: '100',
        merchantId: '1',
        storeName: '张三店',
        businessScope: '中餐',
      } as MerchantApplication,
    ];
    stores = [];
    cats = [];
    nextStoreId = 301;
    nextCatId = 1;
  });

  it('approved 事件 → TX{建 store + 默认分类 + 更新 merchant.approved_store_id}', async () => {
    const sub = new MerchantApprovedSubscriber(makeFakeDataSource());
    await sub.handle({
      merchantId: '1',
      applicationId: '100',
      commissionRate: 0.05,
      approvedAt: Date.now(),
      auditedBy: 'admin-1',
    });
    expect(stores).toHaveLength(1);
    expect(stores[0]!.businessStatus).toBe('offline');
    expect(stores[0]!.commissionRate).toBe('0.05');
    expect(cats).toHaveLength(1);
    expect(cats[0]!.name).toBe('默认分类');
    expect(merchants[0]!.approvedStoreId).toBe(stores[0]!.storeId);
  });

  it('幂等:已建店再调 → 跳过不重复建', async () => {
    merchants[0]!.approvedStoreId = '999';
    const sub = new MerchantApprovedSubscriber(makeFakeDataSource());
    await sub.handle({
      merchantId: '1',
      applicationId: '100',
      commissionRate: 0.05,
      approvedAt: Date.now(),
      auditedBy: 'admin-1',
    });
    expect(stores).toHaveLength(0);
    expect(cats).toHaveLength(0);
  });
});
