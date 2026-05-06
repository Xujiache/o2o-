import type {
  DispatchTask,
  RiderEarning,
  RiderStatus,
  RiderTask,
  RiderViolation,
  TrackPoint,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { DistributedLockService } from '../distributed-lock.service';

import { DeliveryTimeoutMarkJob } from './delivery-timeout-mark.job';
import { DispatchTimeoutRetryJob } from './dispatch-timeout-retry.job';
import { RiderEarningDailySettleJob } from './rider-earning-daily-settle.job';
import { RiderViolationDeductJob } from './rider-violation-deduct.job';
import { TrackCompressJob } from './track-compress.job';

/* eslint-disable @typescript-eslint/no-explicit-any */
const fakeLock = (): DistributedLockService =>
  ({
    acquire: jest.fn(async () => 'token'),
    release: jest.fn(async () => undefined),
  }) as unknown as DistributedLockService;

const fakeBus = (events: { name: string; payload: unknown }[]): DomainEventBus =>
  ({
    publish: jest.fn(async (name: string, payload: unknown) => {
      events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  }) as unknown as DomainEventBus;

describe('DispatchTimeoutRetryJob', () => {
  it('retry_count<3 → 重派 + emit DispatchStarted + 增 retry_count', async () => {
    const dispatches: DispatchTask[] = [
      {
        dispatchTaskId: '1',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        status: 'PENDING',
        retryCount: 0,
        timeoutAt: String(Date.now() - 60_000),
      } as DispatchTask,
    ];
    const updates: any[] = [];
    const dispatchRepo: any = {
      find: jest.fn(async () => dispatches),
      update: jest.fn(async (where: any, set: any) => {
        const d = dispatches.find((x) => x.dispatchTaskId === where.dispatchTaskId);
        if (d) Object.assign(d, set);
        updates.push({ where, set });
      }),
    };
    const riders: RiderStatus[] = [{ riderId: '30001', onlineStatus: 'online' } as RiderStatus];
    const riderStatusRepo: any = { find: jest.fn(async () => riders) };
    const events: { name: string; payload: unknown }[] = [];
    const job = new DispatchTimeoutRetryJob(dispatchRepo, riderStatusRepo, fakeBus(events), fakeLock());
    await job.do();
    expect(dispatches[0]!.retryCount).toBe(1);
    expect(events[0]!.name).toBe('domain.dispatch.started');
  });

  it('retry_count>=3 → 标 TIMEOUT 终止', async () => {
    const dispatches: DispatchTask[] = [
      {
        dispatchTaskId: '1',
        bizType: 'FOOD',
        bizOrderId: '510001',
        bizTaskId: null,
        status: 'PENDING',
        retryCount: 3,
        timeoutAt: String(Date.now() - 60_000),
      } as DispatchTask,
    ];
    const dispatchRepo: any = {
      find: jest.fn(async () => dispatches),
      update: jest.fn(async (where: any, set: any) => {
        const d = dispatches.find((x) => x.dispatchTaskId === where.dispatchTaskId);
        if (d) Object.assign(d, set);
      }),
    };
    const events: { name: string; payload: unknown }[] = [];
    const job = new DispatchTimeoutRetryJob(
      dispatchRepo,
      { find: jest.fn(async () => []) } as any,
      fakeBus(events),
      fakeLock(),
    );
    await job.do();
    expect(dispatches[0]!.status).toBe('TIMEOUT');
    expect(events.length).toBe(0);
  });

  it('无 overdue 不报错', async () => {
    const dispatchRepo: any = { find: jest.fn(async () => []) };
    const job = new DispatchTimeoutRetryJob(dispatchRepo, { find: jest.fn() } as any, fakeBus([]), fakeLock());
    await expect(job.do()).resolves.toBeUndefined();
  });
});

describe('TrackCompressJob', () => {
  it('按 30s 间隔保留点', async () => {
    const points: TrackPoint[] = [
      { trackPointId: '1', riderTaskId: 'T1', recordedAt: '0' } as TrackPoint,
      { trackPointId: '2', riderTaskId: 'T1', recordedAt: '10000' } as TrackPoint,
      { trackPointId: '3', riderTaskId: 'T1', recordedAt: '20000' } as TrackPoint,
      { trackPointId: '4', riderTaskId: 'T1', recordedAt: '40000' } as TrackPoint,
      { trackPointId: '5', riderTaskId: 'T1', recordedAt: '70000' } as TrackPoint,
    ];
    const removed: string[] = [];
    const repo: any = {
      find: jest.fn(async () => points),
      delete: jest.fn(async (ids: string[]) => removed.push(...ids)),
    };
    const job = new TrackCompressJob(repo, fakeLock());
    await job.do();
    // First 30s window:1 kept (0, others < 30s); 30s window:4 (40000 - 0 = 40s); 70s window:5
    // 1 kept, 2/3 removed; 4 kept (40-0>=30); 5 kept (70-40>=30)
    expect(removed.sort()).toEqual(['2', '3']);
  });

  it('无旧点不操作', async () => {
    const repo: any = { find: jest.fn(async () => []), delete: jest.fn() };
    const job = new TrackCompressJob(repo, fakeLock());
    await job.do();
    expect((repo.delete as jest.Mock).mock.calls.length).toBe(0);
  });
});

describe('DeliveryTimeoutMarkJob', () => {
  it('etaAt + 5min 之前 → 创 LATE violation', async () => {
    const tasks: RiderTask[] = [
      {
        riderTaskId: 'RT1',
        riderId: '30001',
        status: 'DELIVERING',
        etaAt: String(Date.now() - 10 * 60 * 1000),
      } as RiderTask,
    ];
    const taskRepo: any = { find: jest.fn(async () => tasks) };
    const violations: RiderViolation[] = [];
    const violationRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row: any) => row),
      save: jest.fn(async (row: any) => {
        const inserted = { ...row, riderViolationId: String(violations.length + 1) };
        violations.push(inserted);
        return inserted;
      }),
    };
    const job = new DeliveryTimeoutMarkJob(taskRepo, violationRepo, fakeLock());
    await job.do();
    expect(violations.length).toBe(1);
    expect(violations[0]!.type).toBe('LATE');
    expect(violations[0]!.status).toBe('CONFIRMED');
  });

  it('已存在 LATE violation 跳过', async () => {
    const tasks: RiderTask[] = [
      {
        riderTaskId: 'RT1',
        riderId: '30001',
        status: 'DELIVERING',
        etaAt: String(Date.now() - 10 * 60 * 1000),
      } as RiderTask,
    ];
    const violations: RiderViolation[] = [];
    const violationRepo: any = {
      findOne: jest.fn(async () => ({ riderViolationId: 'V1' })),
      create: jest.fn(),
      save: jest.fn(),
    };
    const job = new DeliveryTimeoutMarkJob({ find: jest.fn(async () => tasks) } as any, violationRepo, fakeLock());
    await job.do();
    expect(violations.length).toBe(0);
  });
});

describe('RiderEarningDailySettleJob', () => {
  it('聚合前一日 DELIVERED rider_task 创 earning', async () => {
    const tasks: RiderTask[] = [
      { riderId: '30001', bizType: 'FOOD', status: 'DELIVERED', deliveredAt: '0' } as RiderTask,
      { riderId: '30001', bizType: 'ERRAND', status: 'DELIVERED', deliveredAt: '0' } as RiderTask,
      { riderId: '30002', bizType: 'FOOD', status: 'DELIVERED', deliveredAt: '0' } as RiderTask,
    ];
    const taskRepo: any = { find: jest.fn(async () => tasks) };
    const earnings: RiderEarning[] = [];
    const earningRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row: any) => row),
      save: jest.fn(async (row: any) => {
        const inserted = { ...row, riderEarningId: String(earnings.length + 1) };
        earnings.push(inserted);
        return inserted;
      }),
    };
    const sysConfigRepo: any = { findOne: jest.fn(async () => null) };
    const events: { name: string; payload: unknown }[] = [];
    const job = new RiderEarningDailySettleJob(earningRepo, taskRepo, sysConfigRepo, fakeBus(events), fakeLock());
    await job.do();
    expect(earnings.length).toBe(2);
    expect(events.length).toBe(2);
    // rider 30001:2 单(food + errand),base = 500 + 300 = 800;timely 200*2=400;total=1200
    const r1 = earnings.find((e) => e.riderId === '30001')!;
    expect(r1.totalAmount).toBe('1200');
  });

  it('已存在 earning 跳过', async () => {
    const earnings: RiderEarning[] = [];
    const earningRepo: any = {
      findOne: jest.fn(async () => ({ riderEarningId: 'E1' })),
      create: jest.fn(),
      save: jest.fn(),
    };
    const job = new RiderEarningDailySettleJob(
      earningRepo,
      { find: jest.fn(async () => [{ riderId: '30001', bizType: 'FOOD', status: 'DELIVERED' }]) } as any,
      { findOne: jest.fn(async () => null) } as any,
      fakeBus([]),
      fakeLock(),
    );
    await job.do();
    expect(earnings.length).toBe(0);
  });
});

describe('RiderViolationDeductJob', () => {
  it('CONFIRMED + deduct_cents>0 + 未扣 → 扣到当前 PENDING earning', async () => {
    const violations: RiderViolation[] = [
      {
        riderViolationId: 'V1',
        riderId: '30001',
        deductCents: '200',
        status: 'CONFIRMED',
        deductedToEarningId: null,
      } as RiderViolation,
    ];
    const earnings: RiderEarning[] = [
      {
        riderEarningId: 'E1',
        riderId: '30001',
        status: 'PENDING',
        deductAmount: '0',
        totalAmount: '1000',
      } as RiderEarning,
    ];
    const violationRepo: any = {
      find: jest.fn(async () => violations),
      update: jest.fn(async (where: any, set: any) => {
        const v = violations.find((x) => x.riderViolationId === where.riderViolationId);
        if (v) Object.assign(v, set);
      }),
    };
    const earningRepo: any = {
      findOne: jest.fn(async () => earnings[0]),
      update: jest.fn(async (where: any, set: any) => {
        const e = earnings.find((x) => x.riderEarningId === where.riderEarningId);
        if (e) Object.assign(e, set);
      }),
    };
    const job = new RiderViolationDeductJob(violationRepo, earningRepo, fakeLock());
    await job.do();
    expect(earnings[0]!.deductAmount).toBe('200');
    expect(earnings[0]!.totalAmount).toBe('800');
    expect(violations[0]!.deductedToEarningId).toBe('E1');
  });

  it('无 PENDING earning 跳过', async () => {
    const violations: RiderViolation[] = [
      {
        riderViolationId: 'V1',
        riderId: '30001',
        deductCents: '200',
        status: 'CONFIRMED',
        deductedToEarningId: null,
      } as RiderViolation,
    ];
    const violationRepo: any = {
      find: jest.fn(async () => violations),
      update: jest.fn(),
    };
    const earningRepo: any = { findOne: jest.fn(async () => null), update: jest.fn() };
    const job = new RiderViolationDeductJob(violationRepo, earningRepo, fakeLock());
    await job.do();
    expect((violationRepo.update as jest.Mock).mock.calls.length).toBe(0);
  });
});
/* eslint-enable */
