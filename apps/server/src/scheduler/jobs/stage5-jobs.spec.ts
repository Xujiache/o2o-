import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { FoodOrder, OrderTimeline, PaymentOrder, ProductSku, StockLock } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { DistributedLockService } from '../distributed-lock.service';

import { MerchantAcceptTimeoutCancelJob } from './merchant-accept-timeout-cancel.job';
import { PaymentCallbackRetryJob } from './payment-callback-retry.job';
import { ReservedOrderDispatchJob } from './reserved-order-dispatch.job';
import { WaitPayTimeoutCloseJob } from './wait-pay-timeout-close.job';

const fakeLock = (): jest.Mocked<DistributedLockService> =>
  ({
    acquire: jest.fn(async () => true),
    release: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<DistributedLockService>;

interface World {
  orders: FoodOrder[];
  payments: PaymentOrder[];
  skus: ProductSku[];
  stockLocks: StockLock[];
  timelines: OrderTimeline[];
  publishedEvents: Array<{ name: string }>;
}

function makeWorld(): World {
  return {
    orders: [],
    payments: [],
    skus: [],
    stockLocks: [],
    timelines: [],
    publishedEvents: [],
  };
}

function fakeOrderRepo(w: World): jest.Mocked<Repository<FoodOrder>> {
  return {
    createQueryBuilder: jest.fn(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qb: any = {};
      let predicate: 'WAIT_PAY_TIMEOUT' | 'MERCHANT_TIMEOUT' | 'RESERVED' | null = null;
      const args: { now?: number; cutoff?: number; soon?: number } = {};
      qb.where = jest.fn().mockImplementation((sql: string, params?: Record<string, number>) => {
        if (sql.includes("'WAIT_PAY' AND o.expire_at")) predicate = 'WAIT_PAY_TIMEOUT';
        if (sql.includes("'PAID_WAIT_MERCHANT' AND o.paid_at")) predicate = 'MERCHANT_TIMEOUT';
        if (sql.includes('reserved') || sql.includes("'reserved'")) predicate = 'RESERVED';
        if (params) Object.assign(args, params);
        return qb;
      });
      qb.andWhere = jest.fn().mockImplementation((_sql: string, params?: Record<string, number>) => {
        if (params) Object.assign(args, params);
        return qb;
      });
      qb.limit = jest.fn().mockImplementation(() => qb);
      qb.getMany = jest.fn(async () => {
        if (predicate === 'WAIT_PAY_TIMEOUT')
          return w.orders.filter((o) => o.status === 'WAIT_PAY' && Number(o.expireAt) < (args.now ?? Date.now()));
        if (predicate === 'MERCHANT_TIMEOUT')
          return w.orders.filter(
            (o) => o.status === 'PAID_WAIT_MERCHANT' && o.paidAt && Number(o.paidAt) < (args.cutoff ?? 0),
          );
        if (predicate === 'RESERVED')
          return w.orders.filter(
            (o) =>
              o.deliveryType === 'reserved' &&
              o.status === 'PAID_WAIT_MERCHANT' &&
              o.reservedTime &&
              Number(o.reservedTime) >= (args.now ?? 0) &&
              Number(o.reservedTime) <= (args.soon ?? Number.MAX_SAFE_INTEGER),
          );
        return [];
      });
      return qb;
    }),
  } as unknown as jest.Mocked<Repository<FoodOrder>>;
}

function fakeDataSource(w: World): jest.Mocked<DataSource> {
  return {
    transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
      const em: Partial<EntityManager> = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getRepository: jest.fn().mockImplementation((entity: any) => {
          const name: string = entity?.name ?? '';
          if (name === 'FoodOrder') {
            return {
              update: jest.fn(async (criteria: Partial<FoodOrder>, patch: Partial<FoodOrder>) => {
                const idx = w.orders.findIndex((o) => o.foodOrderId === criteria.foodOrderId);
                if (idx >= 0) w.orders[idx] = { ...w.orders[idx]!, ...patch };
                return { affected: 1, raw: [] };
              }),
            };
          }
          if (name === 'StockLock') {
            return {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              find: jest.fn(({ where }: { where: any }) =>
                Promise.resolve(w.stockLocks.filter((l) => l.orderId === where.orderId && l.status === where.status)),
              ),
              update: jest.fn(async (criteria: Partial<StockLock>, patch: Partial<StockLock>) => {
                const idx = w.stockLocks.findIndex((l) => l.stockLockId === criteria.stockLockId);
                if (idx >= 0) w.stockLocks[idx] = { ...w.stockLocks[idx]!, ...patch };
                return { affected: 1, raw: [] };
              }),
            };
          }
          if (name === 'ProductSku') {
            return {
              decrement: jest.fn(async (criteria: { skuId: string }, _f: string, by: number) => {
                const sku = w.skus.find((s) => s.skuId === criteria.skuId);
                if (sku) sku.stockLocked = Math.max(0, sku.stockLocked - by);
                return { affected: 1, raw: [] };
              }),
              increment: jest.fn(async (criteria: { skuId: string }, _f: string, by: number) => {
                const sku = w.skus.find((s) => s.skuId === criteria.skuId);
                if (sku) sku.stock += by;
                return { affected: 1, raw: [] };
              }),
            };
          }
          if (name === 'OrderTimeline') {
            return {
              insert: jest.fn(async (rec: Partial<OrderTimeline>) => {
                w.timelines.push(rec as OrderTimeline);
                return { identifiers: [], generatedMaps: [], raw: [] };
              }),
            };
          }
          return {};
        }),
      };
      return cb(em as EntityManager);
    }),
  } as unknown as jest.Mocked<DataSource>;
}

function fakeBus(w: World): jest.Mocked<DomainEventBus> {
  return {
    publish: jest.fn(async (name: string) => {
      w.publishedEvents.push({ name });
      return { eventId: 'evt' };
    }),
  } as unknown as jest.Mocked<DomainEventBus>;
}

describe('Stage 5 jobs', () => {
  describe('WaitPayTimeoutCloseJob', () => {
    it('无超时单 → debug 不抛', async () => {
      const w = makeWorld();
      const job = new WaitPayTimeoutCloseJob(fakeOrderRepo(w), fakeDataSource(w), fakeBus(w), fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
      expect(w.orders).toHaveLength(0);
    });

    it('超时单 → CANCELLED + stock_lock released + 2 事件', async () => {
      const w = makeWorld();
      w.orders.push({
        foodOrderId: '700001',
        customerId: '10001',
        status: 'WAIT_PAY',
        expireAt: String(Date.now() - 1000),
      } as unknown as FoodOrder);
      w.skus.push({ skuId: '9011', stock: 50, stockLocked: 2 } as unknown as ProductSku);
      w.stockLocks.push({
        stockLockId: 'L1',
        orderId: '700001',
        skuId: '9011',
        quantity: 2,
        status: 'active',
      } as unknown as StockLock);
      const job = new WaitPayTimeoutCloseJob(fakeOrderRepo(w), fakeDataSource(w), fakeBus(w), fakeLock());
      await job.do();
      expect(w.orders[0]!.status).toBe('CANCELLED');
      expect(w.stockLocks[0]!.status).toBe('released');
      expect(w.skus[0]!.stockLocked).toBe(0);
      expect(w.publishedEvents.map((e) => e.name)).toEqual(['domain.food-order.cancelled', 'domain.stock.released']);
    });
  });

  describe('MerchantAcceptTimeoutCancelJob', () => {
    it('无超时单 → debug', async () => {
      const w = makeWorld();
      const job = new MerchantAcceptTimeoutCancelJob(fakeOrderRepo(w), fakeDataSource(w), fakeBus(w), fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
    });

    it('PAID_WAIT_MERCHANT 10min+ → CANCELLED + sku.stock 复原(consumed→released)', async () => {
      const w = makeWorld();
      w.orders.push({
        foodOrderId: '700002',
        customerId: '10001',
        status: 'PAID_WAIT_MERCHANT',
        paidAt: String(Date.now() - 15 * 60 * 1000),
      } as unknown as FoodOrder);
      w.skus.push({ skuId: '9011', stock: 48, stockLocked: 0 } as unknown as ProductSku);
      w.stockLocks.push({
        stockLockId: 'L2',
        orderId: '700002',
        skuId: '9011',
        quantity: 2,
        status: 'consumed',
      } as unknown as StockLock);
      const job = new MerchantAcceptTimeoutCancelJob(fakeOrderRepo(w), fakeDataSource(w), fakeBus(w), fakeLock());
      await job.do();
      expect(w.orders[0]!.status).toBe('CANCELLED');
      expect(w.stockLocks[0]!.status).toBe('released');
      expect(w.skus[0]!.stock).toBe(50); // 48 + 2 复原
    });
  });

  describe('PaymentCallbackRetryJob', () => {
    it('无 pending 支付单 → debug 不抛', async () => {
      const repo = {
        find: jest.fn(async () => []),
        update: jest.fn(async () => ({ affected: 0, raw: [] })),
      } as unknown as jest.Mocked<Repository<PaymentOrder>>;
      const job = new PaymentCallbackRetryJob(repo, fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
    });

    it('pending 单 retryCount<3 → +1', async () => {
      const payments: PaymentOrder[] = [
        {
          paymentOrderId: '800001',
          payOrderNo: 'P1',
          status: 'pending',
          retryCount: 1,
          createdAt: String(Date.now() - 10 * 60 * 1000),
        } as unknown as PaymentOrder,
      ];
      const repo = {
        find: jest.fn(async () => payments),
        update: jest.fn(async (criteria: Partial<PaymentOrder>, patch: Partial<PaymentOrder>) => {
          Object.assign(payments[0]!, patch);
          void criteria;
          return { affected: 1, raw: [] };
        }),
      } as unknown as jest.Mocked<Repository<PaymentOrder>>;
      const job = new PaymentCallbackRetryJob(repo, fakeLock());
      await job.do();
      expect(payments[0]!.retryCount).toBe(2);
    });

    it('retryCount 已达 3 → expired', async () => {
      const payments: PaymentOrder[] = [
        {
          paymentOrderId: '800002',
          payOrderNo: 'P2',
          status: 'pending',
          retryCount: 3,
          createdAt: String(Date.now() - 10 * 60 * 1000),
        } as unknown as PaymentOrder,
      ];
      const repo = {
        find: jest.fn(async () => payments),
        update: jest.fn(async (criteria: Partial<PaymentOrder>, patch: Partial<PaymentOrder>) => {
          Object.assign(payments[0]!, patch);
          void criteria;
          return { affected: 1, raw: [] };
        }),
      } as unknown as jest.Mocked<Repository<PaymentOrder>>;
      const job = new PaymentCallbackRetryJob(repo, fakeLock());
      await job.do();
      expect(payments[0]!.status).toBe('expired');
    });
  });

  describe('ReservedOrderDispatchJob', () => {
    it('无 reserved 订单 → debug', async () => {
      const w = makeWorld();
      const job = new ReservedOrderDispatchJob(fakeOrderRepo(w), fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
    });

    it('30min 内 reserved + PAID_WAIT_MERCHANT → 提醒', async () => {
      const w = makeWorld();
      w.orders.push({
        foodOrderId: '700003',
        deliveryType: 'reserved',
        status: 'PAID_WAIT_MERCHANT',
        reservedTime: String(Date.now() + 15 * 60 * 1000),
      } as unknown as FoodOrder);
      const job = new ReservedOrderDispatchJob(fakeOrderRepo(w), fakeLock());
      await expect(job.do()).resolves.toBeUndefined();
    });
  });
});
