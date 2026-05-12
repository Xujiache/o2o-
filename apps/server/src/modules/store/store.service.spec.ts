import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { MerchantAccount, Store, StoreBusinessHour, StoreDeliveryArea } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { FileService } from '../file/file.service';

import { StoreService } from './store.service';

describe('StoreService', () => {
  let svc: StoreService;
  let stores: Store[];
  let hours: StoreBusinessHour[];
  let areas: StoreDeliveryArea[];
  let merchants: MerchantAccount[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;

  let storeRepo: jest.Mocked<Repository<Store>>;
  let hourRepo: jest.Mocked<Repository<StoreBusinessHour>>;
  let areaRepo: jest.Mocked<Repository<StoreDeliveryArea>>;
  let merchantRepo: jest.Mocked<Repository<MerchantAccount>>;
  let dataSource: { transaction: jest.Mock };
  let bus: jest.Mocked<DomainEventBus>;
  let fileService: jest.Mocked<FileService>;

  beforeEach(() => {
    stores = [
      {
        storeId: '201',
        merchantId: '1',
        name: '张三家',
        avatarFileId: null,
        intro: null,
        businessScope: '中餐',
        businessStatus: 'offline',
        minOrderAmount: '1500',
        deliveryFee: '300',
        commissionRate: '0.0500',
        notice: null,
        cityCode: null,
        createdAt: '0',
        updatedAt: '0',
      } as Store,
      {
        storeId: '202',
        merchantId: '2',
        name: '平台下线店',
        avatarFileId: null,
        intro: null,
        businessScope: '中餐',
        businessStatus: 'paused',
        minOrderAmount: '0',
        deliveryFee: '0',
        commissionRate: null,
        notice: null,
        cityCode: null,
        createdAt: '0',
        updatedAt: '0',
      } as Store,
    ];
    hours = [];
    areas = [];
    merchants = [
      { merchantId: '1', accountStatus: 'active' } as MerchantAccount,
      { merchantId: '2', accountStatus: 'active' } as MerchantAccount,
    ];
    publishedEvents = [];

    storeRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<Store> }) =>
          stores.find(
            (s) =>
              (where.storeId ? s.storeId === where.storeId : true) &&
              (where.merchantId ? s.merchantId === where.merchantId : true),
          ) ?? null,
      ),
      update: jest.fn(async (criteria: Partial<Store>, patch: Partial<Store>) => {
        const s = stores.find((x) => x.storeId === criteria.storeId);
        if (s) Object.assign(s, patch);
        return { affected: s ? 1 : 0 };
      }),
    } as unknown as jest.Mocked<Repository<Store>>;

    hourRepo = {
      find: jest.fn(async () => hours),
    } as unknown as jest.Mocked<Repository<StoreBusinessHour>>;

    areaRepo = {
      find: jest.fn(async () => areas),
    } as unknown as jest.Mocked<Repository<StoreDeliveryArea>>;

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find((m) => m.merchantId === where.merchantId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    const txStoreRepo = {
      update: async (criteria: Partial<Store>, patch: Partial<Store>) => {
        const s = stores.find((x) => x.storeId === criteria.storeId);
        if (s) Object.assign(s, patch);
        return { affected: s ? 1 : 0 };
      },
    };
    const txHourRepo = {
      delete: async () => ({ affected: 0 }),
      insert: async (h: Partial<StoreBusinessHour>) => {
        hours.push(h as StoreBusinessHour);
        return { identifiers: [] };
      },
    };
    const txAreaRepo = {
      delete: async () => ({ affected: 0 }),
      insert: async (a: Partial<StoreDeliveryArea>) => {
        areas.push(a as StoreDeliveryArea);
        return { identifiers: [] };
      },
    };

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
        const em = {
          getRepository: (target: unknown) => {
            const name = (target as { name?: string }).name;
            if (name === 'Store') return txStoreRepo;
            if (name === 'StoreBusinessHour') return txHourRepo;
            if (name === 'StoreDeliveryArea') return txAreaRepo;
            return {} as never;
          },
        } as unknown as EntityManager;
        return cb(em);
      }),
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    fileService = {
      resolveUrl: jest.fn(async (fileId: string | null | undefined) => (fileId ? `https://mock.cdn/${fileId}` : null)),
    } as unknown as jest.Mocked<FileService>;

    svc = new StoreService(
      storeRepo,
      hourRepo,
      areaRepo,
      merchantRepo,
      dataSource as unknown as DataSource,
      bus,
      fileService,
    );
  });

  it('getOwnStore:返回店铺 + 营业时间 + 配送范围', async () => {
    hours.push({ recordId: '1', storeId: '201', dayOfWeek: 1, startTime: '09:00:00', endTime: '22:00:00' });
    const r = await svc.getOwnStore('1');
    expect(r.storeId).toBe('201');
    expect(r.businessHours).toHaveLength(1);
  });

  it('getOwnStore:店铺不存在 → NotFound', async () => {
    await expect(svc.getOwnStore('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateSettings:成功更新基础字段 + 营业时间替换', async () => {
    const r = await svc.updateSettings('1', {
      name: '新店名',
      businessHours: [{ dayOfWeek: 0, startTime: '10:00', endTime: '23:00' }],
    });
    expect(r.storeId).toBe('201');
    expect(stores[0]!.name).toBe('新店名');
    expect(hours).toHaveLength(1);
    expect(hours[0]!.startTime).toBe('10:00:00'); // 自动补秒
  });

  it('setBusinessStatus:online → offline 发 StoreStatusChanged', async () => {
    stores[0]!.businessStatus = 'online';
    await svc.setBusinessStatus('1', { businessStatus: 'offline' });
    expect(stores[0]!.businessStatus).toBe('offline');
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.StoreStatusChanged,
        payload: expect.objectContaining({ beforeStatus: 'online', afterStatus: 'offline', operatorType: 'merchant' }),
      }),
    ]);
  });

  it('setBusinessStatus:同状态 → 不发事件', async () => {
    stores[0]!.businessStatus = 'offline';
    await svc.setBusinessStatus('1', { businessStatus: 'offline' });
    expect(publishedEvents).toHaveLength(0);
  });

  it('setBusinessStatus:平台已 paused → STATUS_INVALID', async () => {
    await expect(svc.setBusinessStatus('2', { businessStatus: 'online' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('forceSetStatus:平台强制 paused 发 admin operator 事件', async () => {
    stores[0]!.businessStatus = 'online';
    await svc.forceSetStatus('201', 'paused', 'admin-1', '违规');
    expect(stores[0]!.businessStatus).toBe('paused');
    expect(publishedEvents[0]!.payload).toMatchObject({ operatorType: 'admin' });
  });
});
