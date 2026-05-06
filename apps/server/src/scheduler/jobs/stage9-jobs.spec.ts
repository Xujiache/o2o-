import type { CouponRule, DashboardSnapshot, ExportTask, FoodOrder, RiskExceptionLog } from '../../database/entities';

import { CouponExpireJob } from './coupon-expire.job';
import { DashboardSnapshotGenerateJob } from './dashboard-snapshot-generate.job';
import { ExportTaskProcessJob } from './export-task-process.job';
import { MarketingActivityToggleJob } from './marketing-activity-toggle.job';
import { ReconciliationJob } from './reconciliation.job';
import { RiskExceptionScanJob } from './risk-exception-scan.job';

/* eslint-disable @typescript-eslint/no-explicit-any */
const lock: any = {
  acquire: jest.fn(async () => 'lock-1'),
  release: jest.fn(async () => undefined),
};

describe('Stage 9 Jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('RiskExceptionScanJob: 扫到超时单 → insert risk_exception_log', async () => {
    const stuck: FoodOrder[] = [{ orderId: '510001', status: 'DELIVERING', updatedAt: '0' } as unknown as FoodOrder];
    const foodRepo: any = { find: jest.fn(async () => stuck) };
    const riskRepo: any = {
      findOne: jest.fn(async () => null),
      insert: jest.fn(async () => ({})),
    };
    const job = new RiskExceptionScanJob(foodRepo, riskRepo, lock);
    await job.do();
    expect(riskRepo.insert).toHaveBeenCalled();
  });

  it('RiskExceptionScanJob: 已存在 OPEN 不重复 insert', async () => {
    const foodRepo: any = {
      find: jest.fn(async () => [{ orderId: '510001', status: 'DELIVERING', updatedAt: '0' } as unknown as FoodOrder]),
    };
    const riskRepo: any = {
      findOne: jest.fn(async () => ({ logId: '1' }) as RiskExceptionLog),
      insert: jest.fn(),
    };
    const job = new RiskExceptionScanJob(foodRepo, riskRepo, lock);
    await job.do();
    expect(riskRepo.insert).not.toHaveBeenCalled();
  });

  it('DashboardSnapshotGenerateJob: 当日无 snapshot → insert + emit', async () => {
    const eventBus: any = { publish: jest.fn(async () => ({ eventId: 'e1' })) };
    const snapshotRepo: any = { findOne: jest.fn(async () => null), insert: jest.fn(async () => ({})) };
    const foodRepo: any = { count: jest.fn(async () => 5) };
    const errandRepo: any = { count: jest.fn(async () => 3) };
    const riderRepo: any = { count: jest.fn(async () => 7) };
    const riskRepo: any = { count: jest.fn(async () => 1) };
    const job = new DashboardSnapshotGenerateJob(
      snapshotRepo,
      foodRepo,
      errandRepo,
      riderRepo,
      riskRepo,
      eventBus,
      lock,
    );
    await job.do();
    expect(snapshotRepo.insert).toHaveBeenCalled();
    expect(eventBus.publish).toHaveBeenCalled();
  });

  it('DashboardSnapshotGenerateJob: 当日已有 snapshot → skip', async () => {
    const eventBus: any = { publish: jest.fn() };
    const snapshotRepo: any = {
      findOne: jest.fn(async () => ({ snapshotId: '1' }) as DashboardSnapshot),
      insert: jest.fn(),
    };
    const foodRepo: any = { count: jest.fn(async () => 0) };
    const errandRepo: any = { count: jest.fn(async () => 0) };
    const riderRepo: any = { count: jest.fn(async () => 0) };
    const riskRepo: any = { count: jest.fn(async () => 0) };
    const job = new DashboardSnapshotGenerateJob(
      snapshotRepo,
      foodRepo,
      errandRepo,
      riderRepo,
      riskRepo,
      eventBus,
      lock,
    );
    await job.do();
    expect(snapshotRepo.insert).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('ExportTaskProcessJob: PENDING 任务 → SUCCESS + fileUrl', async () => {
    const tasks: ExportTask[] = [{ exportTaskId: '1', exportNo: 'EX1', status: 'PENDING' } as unknown as ExportTask];
    const repo: any = {
      find: jest.fn(async () => tasks),
      save: jest.fn(async (t: ExportTask) => t),
    };
    const job = new ExportTaskProcessJob(repo, lock);
    await job.do();
    expect(tasks[0]?.status).toBe('SUCCESS');
    expect(tasks[0]?.fileUrl).toMatch(/^http:\/\/minio\.local\/exports\//);
  });

  it('CouponExpireJob: 调 update query', async () => {
    const exec = jest.fn(async () => ({ affected: 1 }));
    const repo: any = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: exec,
      })),
    };
    const job = new CouponExpireJob(repo, lock);
    await job.do();
    expect(exec).toHaveBeenCalled();
  });

  it('MarketingActivityToggleJob: 调 2 次 update(DRAFT→ACTIVE / ACTIVE→EXPIRED)', async () => {
    const exec = jest.fn(async () => ({ affected: 1 }));
    const repo: any = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: exec,
      })),
    };
    const job = new MarketingActivityToggleJob(repo as unknown as ReturnType<typeof Object>, lock);
    await job.do();
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('ReconciliationJob: 调用 query 统计昨日退款', async () => {
    const getRawMany = jest.fn(async () => [{ status: 'SUCCESS', cnt: '3' }]);
    const refundRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany,
      })),
    };
    const job = new ReconciliationJob(refundRepo, lock);
    await job.do();
    expect(getRawMany).toHaveBeenCalled();
  });
});
/* eslint-enable @typescript-eslint/no-explicit-any */
type _Unused = CouponRule;
