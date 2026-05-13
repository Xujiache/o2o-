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
  const fileService = {
    resolveUrl: jest.fn(async (fileId: string | null | undefined) => (fileId ? `https://mock.cdn/${fileId}` : null)),
    resolveUrls: jest.fn(async (fileIds: Array<string | null | undefined>) =>
      Object.fromEntries(
        fileIds
          .filter((fileId): fileId is string => Boolean(fileId))
          .map((fileId) => [fileId, `https://mock.cdn/${fileId}`]),
      ),
    ),
  };

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
        avatarFileId: 'fid-store',
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
      { merchantId: '2', mobile: 'm2', accountStatus: 'active' } as MerchantAccount,
    ];

    storeRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<Store> }) => stores.find((s) => s.storeId === where.storeId) ?? null,
      ),
      createQueryBuilder: jest.fn(() => {
        const filtered = stores
          .filter((s) => merchants.find((m) => m.merchantId === s.merchantId)?.accountStatus === 'active')
          .sort((a, b) => {
            const aStatus = a.businessStatus === 'online' ? 0 : 1;
            const bStatus = b.businessStatus === 'online' ? 0 : 1;
            if (aStatus !== bStatus) return aStatus - bStatus;
            return Number(b.updatedAt) - Number(a.updatedAt);
          });
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.innerJoin = jest.fn(chain);
        qb.where = jest.fn(chain);
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.addOrderBy = jest.fn(chain);
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
        let storeId = '';
        const qb: Record<string, unknown> = {};
        const chain = () => qb;
        qb.where = jest.fn((_sql: string, params?: { sid?: string }) => {
          if (params?.sid) storeId = params.sid;
          return qb;
        });
        qb.andWhere = jest.fn(chain);
        qb.orderBy = jest.fn(chain);
        qb.skip = jest.fn(chain);
        qb.take = jest.fn(chain);
        qb.getManyAndCount = jest.fn(async () => {
          const filtered = products.filter((p) => p.storeId === storeId && p.saleStatus === 'on_shelf');
          return [filtered, filtered.length] as [Product[], number];
        });
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Product>>;

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find((m) => m.merchantId === where.merchantId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    jest.clearAllMocks();
    svc = new PublicStoreReadonlyService(storeRepo, hourRepo, productRepo, merchantRepo, fileService as never);
  });

  it('listStores:返回 active 商家的在线和休息店铺,在线排前', async () => {
    const r = await svc.listStores({});
    expect(r.total).toBe(2);
    expect(r.list[0]!.storeId).toBe('201');
    expect(r.list[0]!.avatarUrl).toBe('https://mock.cdn/fid-store');
    expect(r.list[1]!.storeId).toBe('202');
  });

  it('getStoreDetail online 店铺 + active 商家 → 详情含营业时间', async () => {
    const detail = await svc.getStoreDetail('201');
    expect(detail.storeId).toBe('201');
    expect(detail.businessHours).toHaveLength(1);
  });

  it('getStoreDetail offline 店铺仍可访问', async () => {
    const detail = await svc.getStoreDetail('202');
    expect(detail.storeId).toBe('202');
    expect(detail.businessStatus).toBe('offline');
  });

  it('getStoreDetail 不存在店铺 → NotFound', async () => {
    await expect(svc.getStoreDetail('404')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listProducts 只返回 on_shelf', async () => {
    const r = await svc.listProducts('201', {});
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.productId).toBe('100');
  });

  it('listProducts offline 店铺返回空商品列表', async () => {
    const r = await svc.listProducts('202', {});
    expect(r.list).toHaveLength(0);
  });
});
