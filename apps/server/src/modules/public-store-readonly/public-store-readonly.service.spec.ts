import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { MerchantAccount, Product, Store, StoreBusinessHour } from '../../database/entities';

import { PublicStoreReadonlyService } from './public-store-readonly.service';

describe('PublicStoreReadonlyService', () => {
  let svc: PublicStoreReadonlyService;
  let stores: Store[];
  let hours: StoreBusinessHour[];
  let products: Product[];
  let merchants: MerchantAccount[];

  let storeRepo: jest.Mocked<Repository<Store>>;
  let hourRepo: jest.Mocked<Repository<StoreBusinessHour>>;
  let productRepo: jest.Mocked<Repository<Product>>;
  let merchantRepo: jest.Mocked<Repository<MerchantAccount>>;

  beforeEach(() => {
    stores = [
      {
        storeId: '201',
        merchantId: '1',
        name: '营业店',
        businessStatus: 'online',
        businessScope: '中餐',
        minOrderAmount: '1500',
        deliveryFee: '300',
        avatarFileId: null,
        intro: null,
        notice: null,
        cityCode: 'BJ',
        updatedAt: '0',
      } as Store,
      {
        storeId: '202',
        merchantId: '2',
        name: '休业店',
        businessStatus: 'offline',
        businessScope: '中餐',
        minOrderAmount: '0',
        deliveryFee: '0',
        avatarFileId: null,
        intro: null,
        notice: null,
        cityCode: 'BJ',
        updatedAt: '0',
      } as Store,
    ];
    hours = [{ recordId: '1', storeId: '201', dayOfWeek: 1, startTime: '09:00:00', endTime: '22:00:00' }];
    products = [
      {
        productId: '100',
        storeId: '201',
        categoryId: '1',
        name: '炒面',
        price: '1500',
        stock: 10,
        saleStatus: 'on_shelf',
        hasSku: 0,
        coverImageFileId: null,
        updatedAt: '0',
      } as Product,
      {
        productId: '101',
        storeId: '201',
        categoryId: '1',
        name: '下架商品',
        price: '2000',
        stock: 5,
        saleStatus: 'off_shelf',
        hasSku: 0,
        coverImageFileId: null,
        updatedAt: '0',
      } as Product,
    ];
    merchants = [
      { merchantId: '1', mobile: 'm1', accountStatus: 'active' } as MerchantAccount,
      { merchantId: '2', mobile: 'm2', accountStatus: 'pending' } as MerchantAccount,
    ];

    storeRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<Store> }) => stores.find((s) => s.storeId === where.storeId) ?? null,
      ),
      createQueryBuilder: jest.fn(() => {
        // 模拟 join MerchantAccount 过滤 + status=online
        const filtered = stores.filter(
          (s) =>
            s.businessStatus === 'online' &&
            merchants.find((m) => m.merchantId === s.merchantId)?.accountStatus === 'active',
        );
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.innerJoin = jest.fn(chain);
        qb.where = jest.fn(chain);
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [filtered, filtered.length] as [Store[], number]);
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Store>>;

    hourRepo = {
      find: jest.fn(async () => hours),
    } as unknown as jest.Mocked<Repository<StoreBusinessHour>>;

    productRepo = {
      createQueryBuilder: jest.fn(() => {
        const filtered = products.filter((p) => p.saleStatus === 'on_shelf');
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.where = jest.fn(chain);
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => [filtered, filtered.length] as [Product[], number]);
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Product>>;

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find((m) => m.merchantId === where.merchantId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    svc = new PublicStoreReadonlyService(storeRepo, hourRepo, productRepo, merchantRepo);
  });

  it('listStores:只返回 online 店铺(过滤 paused/offline 店 + 非 active 商家)', async () => {
    const r = await svc.listStores({});
    expect(r.total).toBe(1);
    expect(r.list[0]!.storeId).toBe('201');
  });

  it('getStoreDetail online 店铺 + active 商家 → 详情含营业时间', async () => {
    const detail = await svc.getStoreDetail('201');
    expect(detail.storeId).toBe('201');
    expect(detail.businessHours).toHaveLength(1);
  });

  it('getStoreDetail offline 店铺 → NotFound', async () => {
    await expect(svc.getStoreDetail('202')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listProducts 只返回 on_shelf', async () => {
    const r = await svc.listProducts('201', {});
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.productId).toBe('100');
  });

  it('listProducts offline 店铺 → NotFound', async () => {
    await expect(svc.listProducts('202', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
