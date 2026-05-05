import { UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { CitySite, PlatformCategory, Store } from '../../database/entities';

import { FoodHomeService } from './food-home.service';

describe('FoodHomeService', () => {
  let svc: FoodHomeService;
  let cities: CitySite[];
  let cats: PlatformCategory[];
  let stores: Store[];
  let cityRepo: jest.Mocked<Repository<CitySite>>;
  let categoryRepo: jest.Mocked<Repository<PlatformCategory>>;
  let storeRepo: jest.Mocked<Repository<Store>>;

  beforeEach(() => {
    cities = [
      { citySiteId: '1', cityCode: 'BJ', cityName: '北京', serviceEnabled: 1 } as unknown as CitySite,
      { citySiteId: '2', cityCode: 'SH', cityName: '上海', serviceEnabled: 0 } as unknown as CitySite,
    ];
    cats = [
      {
        categoryId: '101',
        bizType: 'takeaway',
        parentId: '0',
        name: '快餐',
        iconUrl: null,
        displayOrder: 0,
        enabled: 1,
      } as unknown as PlatformCategory,
      {
        categoryId: '102',
        bizType: 'takeaway',
        parentId: '0',
        name: '甜品',
        iconUrl: 'https://x',
        displayOrder: 1,
        enabled: 1,
      } as unknown as PlatformCategory,
      {
        categoryId: '103',
        bizType: 'errand',
        parentId: '0',
        name: '帮取件',
        iconUrl: null,
        displayOrder: 0,
        enabled: 1,
      } as unknown as PlatformCategory,
      {
        categoryId: '104',
        bizType: 'takeaway',
        parentId: '0',
        name: '禁用',
        iconUrl: null,
        displayOrder: 99,
        enabled: 0,
      } as unknown as PlatformCategory,
    ];
    stores = [
      {
        storeId: '20001',
        name: '北京肯德基',
        cityCode: 'BJ',
        businessStatus: 'online',
        avatarFileId: 'fid-1',
        deliveryFee: '300',
        minOrderAmount: '2000',
        updatedAt: '1000',
      } as unknown as Store,
      {
        storeId: '20002',
        name: '北京麦当劳',
        cityCode: 'BJ',
        businessStatus: 'online',
        avatarFileId: null,
        deliveryFee: '500',
        minOrderAmount: '3000',
        updatedAt: '900',
      } as unknown as Store,
      {
        storeId: '20003',
        name: '北京未上线',
        cityCode: 'BJ',
        businessStatus: 'offline',
        deliveryFee: '0',
        minOrderAmount: '0',
        updatedAt: '500',
      } as unknown as Store,
    ];

    cityRepo = {
      findOne: jest.fn(({ where }: { where: Partial<CitySite> }) =>
        Promise.resolve(cities.find((c) => c.cityCode === where.cityCode) ?? null),
      ),
    } as unknown as jest.Mocked<Repository<CitySite>>;

    categoryRepo = {
      createQueryBuilder: jest.fn(() => {
        const filters: { bt?: string } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: any = {};
        qb.where = jest.fn().mockImplementation(() => qb);
        qb.andWhere = jest.fn().mockImplementation((_sql: string, params?: { bt?: string }) => {
          if (params?.bt) filters.bt = params.bt;
          return qb;
        });
        qb.orderBy = jest.fn().mockImplementation(() => qb);
        qb.getMany = jest
          .fn()
          .mockImplementation(async () =>
            cats.filter(
              (c) => c.bizType === (filters.bt ?? 'takeaway') && Number(c.parentId) === 0 && Number(c.enabled) === 1,
            ),
          );
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<PlatformCategory>>;

    storeRepo = {
      createQueryBuilder: jest.fn(() => {
        const filters: { cc?: string } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: any = {};
        qb.where = jest.fn().mockImplementation((_sql: string, params?: { cc?: string }) => {
          if (params?.cc) filters.cc = params.cc;
          return qb;
        });
        qb.andWhere = jest.fn().mockImplementation(() => qb);
        qb.orderBy = jest.fn().mockImplementation(() => qb);
        qb.limit = jest.fn().mockImplementation(() => qb);
        qb.getMany = jest
          .fn()
          .mockImplementation(async () =>
            stores.filter((s) => s.cityCode === filters.cc && s.businessStatus === 'online'),
          );
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Store>>;

    svc = new FoodHomeService(cityRepo, categoryRepo, storeRepo);
  });

  it('合法 cityCode → 返 cityCode + categories(takeaway 顶级 enabled)+ recommendedStores(online)', async () => {
    const r = await svc.getHome('BJ');
    expect(r.cityCode).toBe('BJ');
    expect(r.banners).toEqual([]);
    expect(r.activityEntries).toEqual([]);
    expect(r.categories).toHaveLength(2);
    expect(r.categories.map((c) => c.name)).toEqual(['快餐', '甜品']);
    expect(r.recommendedStores).toHaveLength(2);
    expect(r.recommendedStores.map((s) => s.name)).toEqual(['北京肯德基', '北京麦当劳']);
  });

  it('不存在的 cityCode → STATUS_INVALID CITY_NOT_AVAILABLE', async () => {
    await expect(svc.getHome('XX')).rejects.toThrow(UnprocessableEntityException);
  });

  it('已禁用城市(serviceEnabled=0)→ STATUS_INVALID', async () => {
    await expect(svc.getHome('SH')).rejects.toThrow(UnprocessableEntityException);
  });

  it('lng/lat 提供 → recommendedStores.distance 非 null;不提供 → null', async () => {
    const withGeo = await svc.getHome('BJ', 116.4, 39.9);
    expect(withGeo.recommendedStores.every((s) => s.distance !== null)).toBe(true);

    const noGeo = await svc.getHome('BJ');
    expect(noGeo.recommendedStores.every((s) => s.distance === null)).toBe(true);
  });

  it('categories 不返 errand 类目 / 不返 enabled=0 类目', async () => {
    const r = await svc.getHome('BJ');
    expect(r.categories.find((c) => c.name === '帮取件')).toBeUndefined();
    expect(r.categories.find((c) => c.name === '禁用')).toBeUndefined();
  });
});
