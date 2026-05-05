import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type {
  FoodOrder,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  Store,
} from '../../database/entities';

import { RiderTaskPoolService } from './rider-task-pool.service';

describe('RiderTaskPoolService', () => {
  let svc: RiderTaskPoolService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let statuses: RiderStatus[];
  let areas: RiderServiceArea[];
  let foodOrders: FoodOrder[];
  let stores: Store[];

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
    foodOrders = [];
    stores = [{ storeId: '20001', name: '北京肯德基' } as unknown as Store];

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

    const foodOrderRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => foodOrders.filter((o) => o.status === 'READY_FOR_PICKUP')),
      })),
    } as unknown as jest.Mocked<Repository<FoodOrder>>;

    const storeRepo = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => stores),
      })),
    } as unknown as jest.Mocked<Repository<Store>>;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const errandTaskRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })),
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    svc = new RiderTaskPoolService(riderRepo, appRepo, statusRepo, areaRepo, foodOrderRepo, storeRepo, errandTaskRepo);
  });

  it('approved+online+有 service area → 无 READY_FOR_PICKUP 时返空', async () => {
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('approved+online + 有 READY_FOR_PICKUP 食单 → 返简化任务卡', async () => {
    foodOrders.push({
      foodOrderId: '700001',
      storeId: '20001',
      status: 'READY_FOR_PICKUP',
      paidAt: '1000',
      createdAt: '500',
      addressSnapshot: { lng: 116.5, lat: 40.0, detail: '收货地址' },
    } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', {});
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.taskId).toBe('700001');
    expect(r.items[0]!.bizType).toBe('takeaway');
    expect(r.items[0]!.reward).toBe(500);
    expect(r.items[0]!.pickupAddress.text).toBe('北京肯德基');
    expect(r.items[0]!.deliveryAddress.text).toContain('收货');
  });

  it('已 RIDER_ASSIGNED 的食单不返(filter status=READY_FOR_PICKUP)', async () => {
    foodOrders.push({
      foodOrderId: '700002',
      storeId: '20001',
      status: 'RIDER_ASSIGNED',
      paidAt: '1000',
      createdAt: '500',
    } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
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

  it('approved+online 但无 service area → 返空数组', async () => {
    areas.length = 0;
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('query 透传 bizType 不影响骨架行为(本阶段返空)', async () => {
    const r = await svc.listAvailable('1', { bizType: 'takeaway' });
    expect(r.items).toEqual([]);
  });

  it('query 透传 radius 不影响骨架行为', async () => {
    const r = await svc.listAvailable('1', { radius: 5000 });
    expect(r.items).toEqual([]);
  });

  it('query 分页参数透传不影响骨架行为', async () => {
    const r = await svc.listAvailable('1', { page: 1, size: 20 });
    expect(r.total).toBe(0);
  });
});
