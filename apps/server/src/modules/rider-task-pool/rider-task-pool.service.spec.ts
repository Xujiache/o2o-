import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { RiderAccount, RiderApplication, RiderServiceArea, RiderStatus } from '../../database/entities';

import { RiderTaskPoolService } from './rider-task-pool.service';

describe('RiderTaskPoolService', () => {
  let svc: RiderTaskPoolService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let statuses: RiderStatus[];
  let areas: RiderServiceArea[];

  beforeEach(() => {
    riders = [
      { riderId: '1', mobile: '13900000001', accountStatus: 'active' } as RiderAccount,
      { riderId: '2', mobile: '13900000002', accountStatus: 'disabled' } as RiderAccount,
      { riderId: '3', mobile: '13900000003', accountStatus: 'active' } as RiderAccount, // 未 approved
    ];
    applications = [
      { applicationId: '1', mobile: '13900000001', auditStatus: 'approved', submittedAt: '1000' } as RiderApplication,
      { applicationId: '3', mobile: '13900000003', auditStatus: 'pending', submittedAt: '1000' } as RiderApplication,
    ];
    statuses = [{ statusId: '1', riderId: '1', onlineStatus: 'online' } as RiderStatus];
    areas = [{ serviceAreaId: '1', riderId: '1' } as RiderServiceArea];

    const riderRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderAccount> }) => riders.find((r) => r.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderAccount>>;

    const appRepo = {
      findOne: jest.fn(async ({ where }: { where: Partial<RiderApplication> }) => {
        const matches = applications.filter((a) => (where.mobile ? a.mobile === where.mobile : true));
        matches.sort((a, b) => Number(b.submittedAt) - Number(a.submittedAt));
        return matches[0] ?? null;
      }),
    } as unknown as jest.Mocked<Repository<RiderApplication>>;

    const statusRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderStatus> }) => statuses.find((s) => s.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderStatus>>;

    const areaRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderServiceArea> }) =>
          areas.find((a) => a.riderId === where.riderId) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderServiceArea>>;

    svc = new RiderTaskPoolService(riderRepo, appRepo, statusRepo, areaRepo);
  });

  it('approved+online+有 service area → 返空数组(本阶段无源订单)', async () => {
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('未 approved → STATUS_INVALID', async () => {
    await expect(svc.listAvailable('3', {})).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('disabled → STATUS_INVALID', async () => {
    await expect(svc.listAvailable('2', {})).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('未上线 → 返空数组(不抛错)', async () => {
    statuses.length = 0;
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
  });

  it('rider 不存在 → NotFound', async () => {
    await expect(svc.listAvailable('999', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});
