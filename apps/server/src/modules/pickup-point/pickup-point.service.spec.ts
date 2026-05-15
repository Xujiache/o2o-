import { NotFoundException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';

import type { PickupPoint } from '../../database/entities';

import { PickupPointService } from './pickup-point.service';

describe('PickupPointService', () => {
  let svc: PickupPointService;
  let rows: PickupPoint[];
  let repo: jest.Mocked<Repository<PickupPoint>>;

  beforeEach(() => {
    rows = [
      {
        pickupPointId: '1',
        name: '天安门自提点',
        address: '北京市东城区东长安街1号',
        cityCode: 'BJ',
        lng: '116.397428',
        lat: '39.90923',
        businessHourStart: '09:00',
        businessHourEnd: '21:00',
        contactPhone: null,
        status: 'active',
        notice: null,
        createdAt: '0',
        updatedAt: '0',
      } as PickupPoint,
      {
        pickupPointId: '2',
        name: '王府井自提点',
        address: '北京市东城区王府井大街88号',
        cityCode: 'BJ',
        lng: '116.418',
        lat: '39.914',
        businessHourStart: '09:00',
        businessHourEnd: '21:00',
        contactPhone: null,
        status: 'active',
        notice: null,
        createdAt: '0',
        updatedAt: '0',
      } as PickupPoint,
      {
        pickupPointId: '3',
        name: '已下线点',
        address: '某地',
        cityCode: 'BJ',
        lng: '116.30',
        lat: '39.95',
        businessHourStart: '09:00',
        businessHourEnd: '21:00',
        contactPhone: null,
        status: 'offline',
        notice: null,
        createdAt: '0',
        updatedAt: '0',
      } as PickupPoint,
    ];

    interface FakeQb {
      where: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      addOrderBy: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getMany: jest.Mock;
      getManyAndCount: jest.Mock;
    }
    const fakeQb = (): SelectQueryBuilder<PickupPoint> => {
      const filters: Array<(p: PickupPoint) => boolean> = [];
      const qb: FakeQb = {
        where: jest.fn(),
        andWhere: jest.fn(),
        orderBy: jest.fn(),
        addOrderBy: jest.fn(),
        skip: jest.fn(),
        take: jest.fn(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
      };
      qb.where.mockImplementation((cond: string, params: Record<string, unknown>) => {
        if (cond.includes('pp.status = :st')) {
          filters.push((p) => p.status === params.st);
        }
        return qb;
      });
      qb.andWhere.mockImplementation((cond: string, params?: Record<string, unknown>) => {
        if (typeof cond === 'string' && cond.includes('pp.status = :st') && params) {
          filters.push((p) => p.status === params.st);
        } else if (typeof cond === 'string' && cond.includes('pp.city_code = :cc') && params) {
          filters.push((p) => p.cityCode === params.cc);
        }
        return qb;
      });
      qb.orderBy.mockReturnValue(qb);
      qb.addOrderBy.mockReturnValue(qb);
      qb.skip.mockReturnValue(qb);
      qb.take.mockReturnValue(qb);
      qb.getMany.mockImplementation(async () => rows.filter((p) => filters.every((f) => f(p))));
      qb.getManyAndCount.mockImplementation(async () => {
        const filtered = rows.filter((p) => filters.every((f) => f(p)));
        return [filtered, filtered.length];
      });
      return qb as unknown as SelectQueryBuilder<PickupPoint>;
    };

    repo = {
      createQueryBuilder: jest.fn(fakeQb),
      findOne: jest.fn(
        async ({ where }: { where: Partial<PickupPoint> }) =>
          rows.find((p) => p.pickupPointId === where.pickupPointId) ?? null,
      ),
      create: jest.fn((d: Partial<PickupPoint>) => ({ ...d, pickupPointId: '99' }) as PickupPoint),
      save: jest.fn(async (e: PickupPoint) => {
        rows.push(e);
        return e;
      }),
      update: jest.fn(async (where: Partial<PickupPoint>, patch: Partial<PickupPoint>) => {
        const idx = rows.findIndex((p) => p.pickupPointId === where.pickupPointId);
        if (idx >= 0) Object.assign(rows[idx]!, patch);
        return { affected: 1, raw: [] };
      }),
    } as unknown as jest.Mocked<Repository<PickupPoint>>;

    svc = new PickupPointService(repo);
  });

  it('publicList 仅返回 active 自提点,offline 不可见', async () => {
    const r = await svc.publicList({});
    expect(r.list).toHaveLength(2);
    expect(r.list.every((p) => p.status === 'active')).toBe(true);
  });

  it('publicList 传 lng/lat 后按距离升序', async () => {
    const r = await svc.publicList({ lng: 116.397428, lat: 39.90923 });
    expect(r.list).toHaveLength(2);
    expect(r.list[0]!.name).toBe('天安门自提点');
    expect(r.list[0]!.distanceMeters).toBe(0);
    expect(r.list[1]!.distanceMeters).toBeGreaterThan(0);
  });

  it('publicDetail offline 视为不存在', async () => {
    await expect(svc.publicDetail('3')).rejects.toThrow(NotFoundException);
  });

  it('publicDetail active 返字段', async () => {
    const p = await svc.publicDetail('1');
    expect(p.name).toBe('天安门自提点');
    expect(p.status).toBe('active');
  });

  it('adminList 含 offline 也返回', async () => {
    const r = await svc.adminList({});
    expect(r.total).toBe(3);
  });

  it('adminCreate 落 active 默认状态', async () => {
    const r = await svc.adminCreate({
      name: '国贸自提点',
      address: '北京市朝阳区建国路',
      lng: 116.46,
      lat: 39.91,
    });
    expect(r.pickupPointId).toBe('99');
    expect(repo.save).toHaveBeenCalled();
  });

  it('adminUpdate 不存在 → NotFound', async () => {
    await expect(svc.adminUpdate('NO-SUCH', { name: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('adminUpdate 部分字段', async () => {
    const r = await svc.adminUpdate('1', { name: '天安门(改名)', notice: '春节休息' });
    expect(r.pickupPointId).toBe('1');
    expect(repo.update).toHaveBeenCalled();
  });

  it('adminSoftDelete 软下线 status=offline', async () => {
    const r = await svc.adminSoftDelete('1');
    expect(r.pickupPointId).toBe('1');
    expect(repo.update).toHaveBeenCalledWith({ pickupPointId: '1' }, expect.objectContaining({ status: 'offline' }));
  });
});
