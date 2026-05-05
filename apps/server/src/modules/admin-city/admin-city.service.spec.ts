import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';

import type { CitySite } from '../../database/entities';

import { AdminCityService } from './admin-city.service';

describe('AdminCityService', () => {
  let svc: AdminCityService;
  let cities: CitySite[];
  let repo: jest.Mocked<Repository<CitySite>>;

  beforeEach(() => {
    cities = [
      {
        citySiteId: '1',
        cityCode: 'BJ',
        cityName: '北京',
        province: '北京市',
        serviceEnabled: 1,
        serviceArea: null,
        displayOrder: 1,
        createdAt: '0',
        updatedAt: '0',
      } as CitySite,
    ];

    const fakeQb = (): SelectQueryBuilder<CitySite> =>
      ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [cities, cities.length]),
      }) as unknown as SelectQueryBuilder<CitySite>;

    repo = {
      createQueryBuilder: jest.fn(fakeQb),
      findOne: jest.fn(
        async ({ where }: { where: Partial<CitySite> }) =>
          cities.find((c) => c.cityCode === where.cityCode || c.citySiteId === where.citySiteId) ?? null,
      ),
      create: jest.fn((d: Partial<CitySite>) => ({ ...d, citySiteId: '99' }) as CitySite),
      save: jest.fn(async (e: CitySite) => {
        cities.push(e);
        return e;
      }),
      update: jest.fn(async () => ({ affected: 1, raw: [] })),
    } as unknown as jest.Mocked<Repository<CitySite>>;

    svc = new AdminCityService(repo);
  });

  it('list 默认分页 + 返脱字段', async () => {
    const r = await svc.list({});
    expect(r.total).toBe(1);
    expect(r.list[0]!.cityCode).toBe('BJ');
    expect(r.list[0]!.serviceEnabled).toBe(true);
  });

  it('create 重复 cityCode → DUPLICATE_REQUEST', async () => {
    await expect(svc.create({ cityCode: 'BJ', cityName: '北京' })).rejects.toThrow(ConflictException);
  });

  it('create serviceArea 不合法 → INVALID_PARAM', async () => {
    await expect(svc.create({ cityCode: 'SH', cityName: '上海', serviceArea: { type: 'NotPolygon' } })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('create 合法 → 写入', async () => {
    const r = await svc.create({ cityCode: 'GZ', cityName: '广州' });
    expect(r.cityCode).toBe('GZ');
  });

  it('update 不存在 → NotFound', async () => {
    await expect(svc.update('NO-SUCH', { cityName: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('update 部分字段', async () => {
    const r = await svc.update('BJ', { cityName: '北京市', displayOrder: 99 });
    expect(r.cityCode).toBe('BJ');
    expect(repo.update).toHaveBeenCalled();
  });

  it('softDisable 软禁用 service_enabled=0', async () => {
    const r = await svc.softDisable('BJ');
    expect(r.cityCode).toBe('BJ');
    expect(repo.update).toHaveBeenCalledWith({ citySiteId: '1' }, expect.objectContaining({ serviceEnabled: 0 }));
  });

  it('softDisable 不存在 → NotFound', async () => {
    await expect(svc.softDisable('NO-SUCH')).rejects.toThrow(NotFoundException);
  });

  it('update serviceArea null → 允许清空', async () => {
    await svc.update('BJ', { serviceArea: null });
    expect(repo.update).toHaveBeenCalled();
  });
});
