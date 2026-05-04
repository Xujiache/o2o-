import { ForbiddenException } from '@nestjs/common';
import { instanceToPlain } from 'class-transformer';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { CustomerAddress } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';

import { AddressService } from './address.service';

describe('AddressService', () => {
  let svc: AddressService;
  let rows: CustomerAddress[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let repo: jest.Mocked<Repository<CustomerAddress>>;
  let dataSource: { transaction: jest.Mock };
  let bus: jest.Mocked<DomainEventBus>;
  let nextId = 1;

  beforeEach(() => {
    rows = [];
    publishedEvents = [];
    nextId = 1;

    const txRepo = {
      create: (dto: Partial<CustomerAddress>) => dto as CustomerAddress,
      save: async (r: CustomerAddress | CustomerAddress[]) => {
        if (Array.isArray(r)) return r;
        if (!r.addressId) {
          const saved = { ...r, addressId: String(nextId++) };
          rows.push(saved);
          return saved;
        }
        const idx = rows.findIndex((x) => x.addressId === r.addressId);
        if (idx >= 0) rows[idx] = r;
        return r;
      },
      update: async (criteria: Partial<CustomerAddress>, patch: Partial<CustomerAddress>) => {
        let n = 0;
        for (const r of rows) {
          if (criteria.userId ? r.userId === criteria.userId : true) {
            Object.assign(r, patch);
            n++;
          }
        }
        return { affected: n };
      },
      findOne: async ({ where }: { where: Partial<CustomerAddress> }) => {
        return rows.find((r) => r.addressId === where.addressId) ?? null;
      },
    };

    repo = {
      findAndCount: jest.fn(async ({ where }: { where: { userId: string } }) => {
        const filtered = rows.filter((r) => r.userId === where.userId);
        filtered.sort((a, b) => {
          if (a.isDefault !== b.isDefault) return b.isDefault - a.isDefault;
          return Number(b.updatedAt) - Number(a.updatedAt);
        });
        return [filtered, filtered.length] as [CustomerAddress[], number];
      }),
    } as unknown as jest.Mocked<Repository<CustomerAddress>>;

    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
        const em = { getRepository: () => txRepo } as unknown as EntityManager;
        return cb(em);
      }),
    };

    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: 'evt' };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;

    svc = new AddressService(repo, dataSource as unknown as DataSource, bus);
  });

  it('新增地址 + 发布 AddressChanged(action=create)', async () => {
    const r = await svc.upsert('100', {
      receiverName: '张三',
      mobile: '13800000001',
      cityCode: '110000',
      detail: '北京市朝阳区',
      lng: 116.4074,
      lat: 39.9042,
      isDefault: false,
    });
    expect(r.addressId).toBe('1');
    expect(rows).toHaveLength(1);
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.CustomerAddressChanged,
        payload: expect.objectContaining({ userId: '100', action: 'create' }),
      }),
    ]);
  });

  it('设默认时旧默认被清 0(同一 user)', async () => {
    await svc.upsert('200', {
      receiverName: 'A',
      mobile: '13800000002',
      cityCode: '110000',
      detail: 'addr A',
      lng: 116,
      lat: 39,
      isDefault: true,
    });
    await svc.upsert('200', {
      receiverName: 'B',
      mobile: '13800000003',
      cityCode: '110000',
      detail: 'addr B',
      lng: 116,
      lat: 39,
      isDefault: true,
    });
    const userRows = rows.filter((r) => r.userId === '200');
    expect(userRows.filter((r) => r.isDefault === 1)).toHaveLength(1);
    expect(userRows[userRows.length - 1]?.isDefault).toBe(1);
  });

  it('越权访问他人地址 → FORBIDDEN', async () => {
    await svc.upsert('300', {
      receiverName: 'X',
      mobile: '13800000004',
      cityCode: '110000',
      detail: 'addr X',
      lng: 116,
      lat: 39,
      isDefault: false,
    });
    const ownAddrId = rows[0]!.addressId;

    await expect(
      svc.upsert('999', {
        addressId: ownAddrId,
        receiverName: 'Hacker',
        mobile: '13800000005',
        cityCode: '110000',
        detail: 'evil',
        lng: 116,
        lat: 39,
        isDefault: false,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('list 返回脱敏 mobile + 排序 isDefault 优先', async () => {
    await svc.upsert('400', {
      receiverName: 'A',
      mobile: '13812340001',
      cityCode: '110000',
      detail: 'addr A',
      lng: 116,
      lat: 39,
      isDefault: false,
    });
    await new Promise((r) => setTimeout(r, 5));
    await svc.upsert('400', {
      receiverName: 'B',
      mobile: '13812340002',
      cityCode: '110000',
      detail: 'addr B',
      lng: 116,
      lat: 39,
      isDefault: true,
    });

    const page = await svc.list('400', 1, 20);
    expect(page.total).toBe(2);
    expect(page.list[0]?.isDefault).toBe(true);
    // mobile 输出走 ResponseInterceptor → instanceToPlain 触发 @Mask
    const serialized = instanceToPlain(page.list[0]!) as { mobileMasked: string };
    expect(serialized.mobileMasked).toMatch(/^138\*+\d{4}$/);
  });
});
