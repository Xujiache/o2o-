import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { ErrandOrder, ErrandTimeline, FoodOrder, OrderTimeline } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { DistributedLockService } from '../distributed-lock.service';

import { OrderAutoCompleteJob } from './order-auto-complete.job';

const fakeLock = (): jest.Mocked<DistributedLockService> =>
  ({
    acquire: jest.fn(async () => 'tok'),
    release: jest.fn(async () => undefined),
  }) as unknown as jest.Mocked<DistributedLockService>;

interface World {
  foodOrders: FoodOrder[];
  errandOrders: ErrandOrder[];
  foodTimelines: OrderTimeline[];
  errandTimelines: ErrandTimeline[];
  publishedEvents: Array<{ name: string; payload: unknown }>;
}

function makeWorld(): World {
  return { foodOrders: [], errandOrders: [], foodTimelines: [], errandTimelines: [], publishedEvents: [] };
}

function fakeFoodOrderRepo(w: World): jest.Mocked<Repository<FoodOrder>> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(async ({ where }: { where: any }) => {
      const threshold = where.completedAt?._value ?? where.completedAt?.value ?? Number.MAX_SAFE_INTEGER;
      return w.foodOrders.filter(
        (o) => o.status === where.status && o.completedAt !== null && Number(o.completedAt) <= Number(threshold),
      );
    }),
  } as unknown as jest.Mocked<Repository<FoodOrder>>;
}

function fakeErrandOrderRepo(w: World): jest.Mocked<Repository<ErrandOrder>> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    find: jest.fn(async ({ where }: { where: any }) => {
      const threshold = where.completedAt?._value ?? where.completedAt?.value ?? Number.MAX_SAFE_INTEGER;
      return w.errandOrders.filter(
        (o) => o.status === where.status && o.completedAt !== null && Number(o.completedAt) <= Number(threshold),
      );
    }),
  } as unknown as jest.Mocked<Repository<ErrandOrder>>;
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
              createQueryBuilder: () => ({
                update: () => ({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  set: (patch: any) => ({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    where: (_sql: string, params: any) => ({
                      execute: async () => {
                        const idx = w.foodOrders.findIndex(
                          (o) => o.foodOrderId === params.id && o.status === params.st,
                        );
                        if (idx >= 0) {
                          w.foodOrders[idx] = { ...w.foodOrders[idx]!, ...patch };
                          return { affected: 1 };
                        }
                        return { affected: 0 };
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          if (name === 'ErrandOrder') {
            return {
              createQueryBuilder: () => ({
                update: () => ({
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  set: (patch: any) => ({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    where: (_sql: string, params: any) => ({
                      execute: async () => {
                        const idx = w.errandOrders.findIndex(
                          (o) => o.errandOrderId === params.id && o.status === params.st,
                        );
                        if (idx >= 0) {
                          w.errandOrders[idx] = { ...w.errandOrders[idx]!, ...patch };
                          return { affected: 1 };
                        }
                        return { affected: 0 };
                      },
                    }),
                  }),
                }),
              }),
            };
          }
          if (name === 'OrderTimeline') {
            return {
              insert: jest.fn(async (row: OrderTimeline) => {
                w.foodTimelines.push(row);
                return { identifiers: [{ orderTimelineId: String(w.foodTimelines.length) }] };
              }),
            };
          }
          if (name === 'ErrandTimeline') {
            return {
              insert: jest.fn(async (row: ErrandTimeline) => {
                w.errandTimelines.push(row);
                return { identifiers: [{ errandTimelineId: String(w.errandTimelines.length) }] };
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

function fakeEventBus(w: World): jest.Mocked<DomainEventBus> {
  return {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.publishedEvents.push({ name, payload });
    }),
  } as unknown as jest.Mocked<DomainEventBus>;
}

function buildJob(w: World): OrderAutoCompleteJob {
  return new OrderAutoCompleteJob(
    fakeFoodOrderRepo(w),
    fakeErrandOrderRepo(w),
    fakeDataSource(w),
    fakeEventBus(w),
    fakeLock(),
  );
}

describe('OrderAutoCompleteJob', () => {
  it('过 30 分钟的 DELIVERED 外卖订单 → COMPLETED + timeline + 事件', async () => {
    const now = Date.now();
    const w = makeWorld();
    w.foodOrders.push({
      foodOrderId: '700001',
      status: 'DELIVERED',
      completedAt: String(now - 31 * 60 * 1000),
    } as unknown as FoodOrder);
    const job = buildJob(w);
    await job.do();

    expect(w.foodOrders[0]!.status).toBe('COMPLETED');
    expect(w.foodTimelines).toHaveLength(1);
    expect(w.foodTimelines[0]!.fromStatus).toBe('DELIVERED');
    expect(w.foodTimelines[0]!.toStatus).toBe('COMPLETED');
    expect(w.publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.OrderCompleted,
        payload: expect.objectContaining({ orderId: '700001', bizType: 'FOOD' }),
      }),
    ]);
  });

  it('过 30 分钟的 DELIVERED 跑腿订单 → COMPLETED + 跑腿 timeline + 事件', async () => {
    const now = Date.now();
    const w = makeWorld();
    w.errandOrders.push({
      errandOrderId: '800001',
      status: 'DELIVERED',
      completedAt: String(now - 31 * 60 * 1000),
    } as unknown as ErrandOrder);
    const job = buildJob(w);
    await job.do();

    expect(w.errandOrders[0]!.status).toBe('COMPLETED');
    expect(w.errandTimelines).toHaveLength(1);
    expect(w.errandTimelines[0]!.eventType).toBe('COMPLETED');
    expect(w.publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.OrderCompleted,
        payload: expect.objectContaining({ orderId: '800001', bizType: 'ERRAND' }),
      }),
    ]);
  });

  it('未到 30 分钟的 DELIVERED 订单 → 不处理', async () => {
    const now = Date.now();
    const w = makeWorld();
    w.foodOrders.push({
      foodOrderId: '700002',
      status: 'DELIVERED',
      completedAt: String(now - 5 * 60 * 1000), // 才 5 分钟
    } as unknown as FoodOrder);
    const job = buildJob(w);
    await job.do();

    expect(w.foodOrders[0]!.status).toBe('DELIVERED');
    expect(w.foodTimelines).toHaveLength(0);
    expect(w.publishedEvents).toHaveLength(0);
  });

  it('非 DELIVERED 状态 → 不处理', async () => {
    const now = Date.now();
    const w = makeWorld();
    w.foodOrders.push({
      foodOrderId: '700003',
      status: 'COMPLETED',
      completedAt: String(now - 60 * 60 * 1000),
    } as unknown as FoodOrder);
    const job = buildJob(w);
    await job.do();

    expect(w.foodTimelines).toHaveLength(0);
    expect(w.publishedEvents).toHaveLength(0);
  });
});
