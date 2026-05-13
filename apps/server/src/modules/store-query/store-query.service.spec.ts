import type { Repository } from 'typeorm';

import type { Store } from '../../database/entities';

import { StoreQueryService } from './store-query.service';

describe('StoreQueryService', () => {
  let svc: StoreQueryService;
  let stores: Store[];
  let storeRepo: jest.Mocked<Repository<Store>>;
  const fileService = {
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
        storeId: '20001',
        name: '北京肯德基',
        intro: '美式快餐',
        cityCode: 'BJ',
        businessStatus: 'online',
        avatarFileId: 'fid-1',
        deliveryFee: '300',
        minOrderAmount: '2000',
        updatedAt: '5000',
      } as unknown as Store,
      {
        storeId: '20002',
        name: '北京麦当劳',
        intro: '汉堡薯条',
        cityCode: 'BJ',
        businessStatus: 'online',
        avatarFileId: null,
        deliveryFee: '500',
        minOrderAmount: '3000',
        updatedAt: '4000',
      } as unknown as Store,
      {
        storeId: '20003',
        name: '上海星巴克',
        intro: '咖啡',
        cityCode: 'SH',
        businessStatus: 'online',
        avatarFileId: null,
        deliveryFee: '0',
        minOrderAmount: '0',
        updatedAt: '3000',
      } as unknown as Store,
      {
        storeId: '20004',
        name: '北京瑞幸',
        intro: '咖啡',
        cityCode: 'BJ',
        businessStatus: 'paused',
        avatarFileId: null,
        deliveryFee: '0',
        minOrderAmount: '0',
        updatedAt: '6000',
      } as unknown as Store,
    ];

    storeRepo = {
      createQueryBuilder: jest.fn(() => {
        const filters: { cc?: string; kw?: string } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: any = {};
        qb.where = jest.fn().mockImplementation((_sql: string, params?: { cc?: string }) => {
          if (params?.cc) filters.cc = params.cc;
          return qb;
        });
        qb.andWhere = jest.fn().mockImplementation((sql: string, params?: { kw?: string }) => {
          if (params?.kw) filters.kw = params.kw;
          void sql;
          return qb;
        });
        qb.orderBy = jest.fn().mockImplementation(() => qb);
        qb.addOrderBy = jest.fn().mockImplementation(() => qb);
        let _skip = 0;
        let _take = 20;
        qb.skip = jest.fn().mockImplementation((n: number) => {
          _skip = n;
          return qb;
        });
        qb.take = jest.fn().mockImplementation((n: number) => {
          _take = n;
          return qb;
        });
        const filtered = (): Store[] => {
          let arr = [...stores];
          if (filters.cc) arr = arr.filter((s) => s.cityCode === filters.cc);
          if (filters.kw) {
            const k = filters.kw.replace(/%/g, '');
            arr = arr.filter((s) => s.name.includes(k) || (s.intro ?? '').includes(k));
          }
          return arr.sort((a, b) => {
            const aStatus = a.businessStatus === 'online' ? 0 : 1;
            const bStatus = b.businessStatus === 'online' ? 0 : 1;
            if (aStatus !== bStatus) return aStatus - bStatus;
            return Number(b.updatedAt) - Number(a.updatedAt);
          });
        };
        qb.getCount = jest.fn().mockImplementation(async () => filtered().length);
        qb.getMany = jest.fn().mockImplementation(async () => filtered().slice(_skip, _skip + _take));
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<Store>>;

    jest.clearAllMocks();
    svc = new StoreQueryService(storeRepo, fileService as never);
  });

  it('基本分页:cityCode=BJ → 返回在线和休息店铺,sales/rating mock', async () => {
    const r = await svc.list({ cityCode: 'BJ' });
    expect(r.pageNo).toBe(1);
    expect(r.pageSize).toBe(20);
    expect(r.total).toBe(3);
    expect(r.list).toHaveLength(3);
    expect(r.list[0]!.sales).toBe(0);
    expect(r.list[0]!.rating).toBe(5);
    expect(r.list[0]!.iconUrl).toBe('https://mock.cdn/fid-1');
  });

  it('paused 店铺保留并排在在线店铺之后', async () => {
    const r = await svc.list({ cityCode: 'BJ' });
    expect(r.list.find((x) => x.storeId === '20004')).toBeDefined();
    expect(r.list.at(-1)!.storeId).toBe('20004');
  });

  it('cityCode=SH → 仅返上海一家店铺', async () => {
    const r = await svc.list({ cityCode: 'SH' });
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.name).toBe('上海星巴克');
  });

  it('keyword 模糊匹配 name 或 intro', async () => {
    const r = await svc.list({ cityCode: 'BJ', keyword: '快餐' });
    expect(r.list).toHaveLength(1);
    expect(r.list[0]!.name).toContain('肯德基');
  });

  it('keyword 无匹配 → 返空 list / total=0', async () => {
    const r = await svc.list({ cityCode: 'BJ', keyword: 'xxxxxxxx' });
    expect(r.total).toBe(0);
    expect(r.list).toHaveLength(0);
  });

  it('lng/lat 提供 → distance 非 null', async () => {
    const r = await svc.list({ cityCode: 'BJ', lng: 116.4, lat: 39.9 });
    expect(r.list.every((x) => x.distance !== null)).toBe(true);
  });

  it('不提供 lng/lat → distance=null', async () => {
    const r = await svc.list({ cityCode: 'BJ' });
    expect(r.list.every((x) => x.distance === null)).toBe(true);
  });

  it('排序 sort=recent → 按 updated_at DESC(肯德基 5000 > 麦当劳 4000)', async () => {
    const r = await svc.list({ cityCode: 'BJ', sort: 'recent' });
    expect(r.list[0]!.name).toBe('北京肯德基');
    expect(r.list[1]!.name).toBe('北京麦当劳');
  });
});
