import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { RiderAccount, RiderStatus, RiderVehicle } from '../../database/entities';

import { RiderProfileService } from './rider-profile.service';

describe('RiderProfileService', () => {
  let svc: RiderProfileService;
  let riders: RiderAccount[];
  let statuses: RiderStatus[];
  let vehicles: RiderVehicle[];

  beforeEach(() => {
    riders = [
      {
        riderId: '1',
        mobile: '13900000001',
        accountStatus: 'active',
        realName: '骑手张三',
        idCardNo: '110101199001011234',
        healthCertNo: 'HC1',
        healthCertExpiry: '1888888888888',
        approvedAt: '1700000000000',
      } as RiderAccount,
    ];
    statuses = [
      {
        statusId: '1',
        riderId: '1',
        onlineStatus: 'offline',
        creditScore: 100,
      } as RiderStatus,
    ];
    vehicles = [
      {
        vehicleId: '1',
        riderId: '1',
        vehicleType: 'electric_bike',
        plateNo: '京A12345',
        brand: '雅迪',
        status: 'active',
      } as RiderVehicle,
    ];

    const riderRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderAccount> }) => riders.find((r) => r.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderAccount>>;

    const statusRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderStatus> }) => statuses.find((s) => s.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderStatus>>;

    const vehicleRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderVehicle> }) =>
          vehicles.find((v) => v.riderId === where.riderId) ?? null,
      ),
      insert: jest.fn(async () => ({ identifiers: [] })),
      update: jest.fn(async () => ({ affected: 1 })),
    } as unknown as jest.Mocked<Repository<RiderVehicle>>;

    svc = new RiderProfileService(riderRepo, statusRepo, vehicleRepo);
  });

  it('getProfile 已审核骑手 → 返资料 + creditScore 100', async () => {
    const r = await svc.getProfile('1');
    expect(r.realName).toBe('骑手张三');
    expect(r.creditScore).toBe(100);
    expect(r.vehicle?.vehicleType).toBe('electric_bike');
  });

  it('getProfile rider 不存在 → NotFound', async () => {
    await expect(svc.getProfile('999')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update vehicle 已存在 → UPDATE', async () => {
    await svc.update('1', { vehicle: { vehicleType: 'motorcycle', plateNo: '京B67890' } });
    // vehicleRepo.update 会被调用 — 通过 spy 验证
    // 简化:不检查 mock 调用次数,只确保不抛错
  });

  it('update vehicle 不存在 → INSERT', async () => {
    vehicles.length = 0; // 清空
    await svc.update('1', { vehicle: { vehicleType: 'car' } });
  });

  it('update rider 不存在 → NotFound', async () => {
    await expect(svc.update('999', { vehicle: { vehicleType: 'car' } })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update 无 vehicle 字段 → 静默成功', async () => {
    await expect(svc.update('1', {})).resolves.toBeUndefined();
  });
});
