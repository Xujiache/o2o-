import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type {
  DispatchTask,
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
  let dispatchTasks: DispatchTask[];

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
    dispatchTasks = [];

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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const foodOrderRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => foodOrders),
      })),
    };

    const storeRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => stores),
      })),
    };

    const errandTaskRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })),
    };

    const dispatchRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => dispatchTasks.filter((d) => d.status === 'PENDING')),
      })),
    };
    const sysConfigRepo: any = { findOne: jest.fn(async () => null) };
    /* eslint-enable @typescript-eslint/no-explicit-any */
    svc = new RiderTaskPoolService(
      riderRepo,
      appRepo,
      statusRepo,
      areaRepo,
      foodOrderRepo,
      storeRepo,
      errandTaskRepo,
      dispatchRepo,
      sysConfigRepo,
    );
  });

  it('approved+online+有 service area → 无 PENDING dispatch task 时返空', async () => {
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('有 PENDING dispatch task + candidate 含本骑手 → 返回任务卡', async () => {
    dispatchTasks.push({
      dispatchTaskId: 'dt1',
      bizType: 'FOOD',
      bizOrderId: '700001',
      bizTaskId: null,
      candidateRiderIds: ['1', '2'],
      status: 'PENDING',
      timeoutAt: String(Date.now() + 60000),
    } as unknown as DispatchTask);
    foodOrders.push({
      foodOrderId: '700001',
      storeId: '20001',
      addressSnapshot: { lng: 116.5, lat: 40.0, detail: '收货地址' },
    } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', {});
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.taskId).toBe('dt1');
    expect(r.items[0]!.bizType).toBe('takeaway');
    expect(r.items[0]!.reward).toBe(500);
    expect(r.items[0]!.pickupAddress.text).toBe('北京肯德基');
    expect(r.items[0]!.deliveryAddress.text).toContain('收货');
  });

  it('candidate 列表不含本骑手 → 不返(其他骑手抢的单)', async () => {
    dispatchTasks.push({
      dispatchTaskId: 'dt2',
      bizType: 'FOOD',
      bizOrderId: '700002',
      bizTaskId: null,
      candidateRiderIds: ['9', '10'],
      status: 'PENDING',
      timeoutAt: String(Date.now() + 60000),
    } as unknown as DispatchTask);
    foodOrders.push({
      foodOrderId: '700002',
      storeId: '20001',
    } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', {});
    expect(r.items).toEqual([]);
  });

  it('candidate 列表为空数组 → 兼容历史数据,所有骑手都可见', async () => {
    dispatchTasks.push({
      dispatchTaskId: 'dt3',
      bizType: 'FOOD',
      bizOrderId: '700003',
      bizTaskId: null,
      candidateRiderIds: [],
      status: 'PENDING',
      timeoutAt: String(Date.now() + 60000),
    } as unknown as DispatchTask);
    foodOrders.push({
      foodOrderId: '700003',
      storeId: '20001',
    } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', {});
    expect(r.items).toHaveLength(1);
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

  it('query 透传 bizType=takeaway → 只返外卖', async () => {
    dispatchTasks.push({
      dispatchTaskId: 'dt-food',
      bizType: 'FOOD',
      bizOrderId: '800001',
      candidateRiderIds: ['1'],
      status: 'PENDING',
      timeoutAt: String(Date.now() + 60000),
    } as unknown as DispatchTask);
    foodOrders.push({ foodOrderId: '800001', storeId: '20001' } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', { bizType: 'takeaway' });
    expect(r.items).toHaveLength(1);
    expect(r.items[0]!.bizType).toBe('takeaway');
  });

  it('query 透传 bizType=errand → 过滤掉外卖', async () => {
    dispatchTasks.push({
      dispatchTaskId: 'dt-food',
      bizType: 'FOOD',
      bizOrderId: '800001',
      candidateRiderIds: ['1'],
      status: 'PENDING',
      timeoutAt: String(Date.now() + 60000),
    } as unknown as DispatchTask);
    foodOrders.push({ foodOrderId: '800001', storeId: '20001' } as unknown as FoodOrder);
    const r = await svc.listAvailable('1', { bizType: 'errand' });
    expect(r.items).toEqual([]);
  });
});
