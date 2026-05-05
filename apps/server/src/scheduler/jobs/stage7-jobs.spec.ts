import type {
  FoodOrder,
  MerchantSettlement,
  MerchantStatisticsSnapshot,
  MerchantWithdrawal,
  OrderReview,
  Store,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { DistributedLockService } from '../distributed-lock.service';

import { DailyStatisticsSnapshotJob } from './daily-statistics-snapshot.job';
import { MerchantAcceptRemindJob } from './merchant-accept-remind.job';
import { T1MerchantSettlementJob } from './t1-merchant-settlement.job';
import { WithdrawalStatusPollJob } from './withdrawal-status-poll.job';

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

describe('MerchantAcceptRemindJob', () => {
  it('扫到 5min~10min 内 PAID_WAIT_MERCHANT 订单 → 推送 + 不重复', async () => {
    const now = Date.now();
    const orderRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [
          {
            foodOrderId: '510001',
            storeId: '20001',
            payableAmount: '5000',
            status: 'PAID_WAIT_MERCHANT',
            paidAt: String(now - 6 * 60 * 1000),
          } as FoodOrder,
        ]),
      })),
    };
    const storeRepo: any = {
      findOne: jest.fn(async () => ({ storeId: '20001', merchantId: '30001' }) as Store),
    };
    const events: { name: string; payload: unknown }[] = [];
    const job = new MerchantAcceptRemindJob(orderRepo, storeRepo, fakeBus(events), fakeLock());
    await job.do();
    await job.do();
    expect(events.length).toBe(1);
    expect(events[0]!.name).toBe('domain.merchant-order.pushed');
  });

  it('无订单时不报错', async () => {
    const orderRepo: any = {
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      })),
    };
    const events: { name: string; payload: unknown }[] = [];
    const job = new MerchantAcceptRemindJob(orderRepo, { findOne: jest.fn() } as any, fakeBus(events), fakeLock());
    await job.do();
    expect(events.length).toBe(0);
  });
});

describe('T1MerchantSettlementJob', () => {
  it('聚合前一日 COMPLETED 订单生成 settlement + emit', async () => {
    const orders: FoodOrder[] = [
      { foodOrderId: '510001', storeId: '20001', payableAmount: '10000', payStatus: 'paid' } as FoodOrder,
      { foodOrderId: '510002', storeId: '20001', payableAmount: '5000', payStatus: 'refunded' } as FoodOrder,
    ];
    const orderRepo: any = { find: jest.fn(async () => orders) };
    const storeRepo: any = {
      findOne: jest.fn(async () => ({ storeId: '20001', merchantId: '30001' }) as Store),
    };
    const settlements: MerchantSettlement[] = [];
    const settlementRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => {
        const inserted = { ...row, merchantSettlementId: '900001' };
        settlements.push(inserted);
        return inserted;
      }),
    };
    const sysConfigRepo: any = { findOne: jest.fn(async () => null) };
    const events: { name: string; payload: unknown }[] = [];
    const job = new T1MerchantSettlementJob(
      settlementRepo,
      orderRepo,
      storeRepo,
      sysConfigRepo,
      fakeBus(events),
      fakeLock(),
    );
    await job.do();
    expect(settlements.length).toBe(1);
    // gross=15000, refund=5000, net0=10000, commission=5%*10000=500, fee=0.6%*10000=60, net=9440
    expect(settlements[0]!.grossCents).toBe('15000');
    expect(settlements[0]!.refundCount).toBe(1);
    expect(settlements[0]!.netCents).toBe('9440');
    expect(events[0]!.name).toBe('domain.merchant-settlement.generated');
  });

  it('已存在的 settlementNo 跳过', async () => {
    const orders: FoodOrder[] = [
      { foodOrderId: '1', storeId: '20001', payableAmount: '1000', payStatus: 'paid' } as FoodOrder,
    ];
    const settlements: MerchantSettlement[] = [];
    const settlementRepo: any = {
      findOne: jest.fn(async () => ({ settlementNo: 'existing' }) as MerchantSettlement),
      create: jest.fn(),
      save: jest.fn(),
    };
    const events: { name: string; payload: unknown }[] = [];
    const job = new T1MerchantSettlementJob(
      settlementRepo,
      { find: jest.fn(async () => orders) } as any,
      { findOne: jest.fn(async () => ({ storeId: '20001', merchantId: '30001' })) } as any,
      { findOne: jest.fn(async () => null) } as any,
      fakeBus(events),
      fakeLock(),
    );
    await job.do();
    expect(settlements.length).toBe(0);
    expect(events.length).toBe(0);
  });
});

describe('WithdrawalStatusPollJob', () => {
  it('PENDING 超 30s → APPROVED;APPROVED 超 30s → COMPLETED', async () => {
    const now = Date.now();
    const w1: MerchantWithdrawal = {
      merchantWithdrawalId: '1',
      status: 'PENDING',
      submittedAt: String(now - 60_000),
      updatedAt: String(now - 60_000),
    } as MerchantWithdrawal;
    const w2: MerchantWithdrawal = {
      merchantWithdrawalId: '2',
      status: 'APPROVED',
      submittedAt: String(now - 120_000),
      updatedAt: String(now - 60_000),
    } as MerchantWithdrawal;
    const updates: any[] = [];
    const repo: any = {
      find: jest.fn(async (opt: any) => {
        if (opt.where.status === 'PENDING') return [w1];
        if (opt.where.status === 'APPROVED') return [w2];
        return [];
      }),
      update: jest.fn(async (where: any, set: any) => {
        updates.push({ where, set });
      }),
    };
    const job = new WithdrawalStatusPollJob(repo, fakeLock());
    await job.do();
    expect(updates.length).toBe(2);
    expect(updates[0].set.status).toBe('APPROVED');
    expect(updates[1].set.status).toBe('COMPLETED');
  });
});

describe('DailyStatisticsSnapshotJob', () => {
  it('生成前一日快照(订单聚合 + 评分均分)', async () => {
    const orders: FoodOrder[] = [
      { foodOrderId: '1', storeId: '20001', payableAmount: '10000', payStatus: 'paid' } as FoodOrder,
      { foodOrderId: '2', storeId: '20001', payableAmount: '5000', payStatus: 'refunded' } as FoodOrder,
    ];
    const reviews: OrderReview[] = [
      { storeId: '20001', rating: 5, createdAt: '0' } as OrderReview,
      { storeId: '20001', rating: 4, createdAt: '0' } as OrderReview,
    ];
    const snapshots: MerchantStatisticsSnapshot[] = [];
    const snapshotRepo: any = {
      findOne: jest.fn(async () => null),
      create: jest.fn((row: any) => row),
      save: jest.fn(async (row: any) => {
        const inserted = { ...row, merchantStatisticsSnapshotId: '1' };
        snapshots.push(inserted);
        return inserted;
      }),
    };
    const orderRepo: any = { find: jest.fn(async () => orders) };
    const reviewRepo: any = { find: jest.fn(async () => reviews) };
    const storeRepo: any = {
      findOne: jest.fn(async () => ({ storeId: '20001', merchantId: '30001' }) as Store),
    };
    const job = new DailyStatisticsSnapshotJob(snapshotRepo, orderRepo, reviewRepo, storeRepo, fakeLock());
    await job.do();
    expect(snapshots.length).toBe(1);
    expect(snapshots[0]!.orderCount).toBe(2);
    expect(snapshots[0]!.grossCents).toBe('15000');
    expect(snapshots[0]!.refundCents).toBe('5000');
    expect(snapshots[0]!.netCents).toBe('10000');
    expect(snapshots[0]!.storeRating).toBe('4.50');
  });

  it('已存在快照跳过', async () => {
    const snapshots: MerchantStatisticsSnapshot[] = [];
    const snapshotRepo: any = {
      findOne: jest.fn(async () => ({ id: '1' })),
      create: jest.fn(),
      save: jest.fn(),
    };
    const orderRepo: any = {
      find: jest.fn(async () => [
        { foodOrderId: '1', storeId: '20001', payableAmount: '100', payStatus: 'paid' } as FoodOrder,
      ]),
    };
    const job = new DailyStatisticsSnapshotJob(
      snapshotRepo,
      orderRepo,
      { find: jest.fn(async () => []) } as any,
      { findOne: jest.fn(async () => ({ storeId: '20001', merchantId: '30001' })) } as any,
      fakeLock(),
    );
    await job.do();
    expect(snapshots.length).toBe(0);
  });
});
/* eslint-enable */
