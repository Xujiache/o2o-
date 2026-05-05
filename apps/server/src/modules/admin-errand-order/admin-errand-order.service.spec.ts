import { NotFoundException } from '@nestjs/common';

import type { ErrandOrder, ErrandOrderDetail, ErrandTask, ErrandTimeline } from '../../database/entities';

import { AdminErrandOrderService } from './admin-errand-order.service';

interface World {
  orders: ErrandOrder[];
  details: ErrandOrderDetail[];
  timelines: ErrandTimeline[];
  tasks: ErrandTask[];
}

function makeOrder(o: Partial<ErrandOrder>): ErrandOrder {
  return {
    errandOrderId: '600001',
    orderNo: 'E1',
    customerId: '10001',
    typeCode: 'BUY',
    status: 'WAIT_PAY',
    payStatus: 'unpaid',
    payOrderId: null,
    baseFee: '500',
    distanceFee: '0',
    urgentFee: '0',
    budget: null,
    payableAmount: '500',
    paidAmount: null,
    urgentLevel: 'standard',
    reservedTime: null,
    expireAt: '0',
    paidAt: null,
    dispatchingAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    completedAt: null,
    createdAt: '100',
    updatedAt: '100',
    ...o,
  } as ErrandOrder;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.errandOrderId === opt.where.errandOrderId) ?? null),
    createQueryBuilder: jest.fn(() => {
      const filters: { status?: string; customerId?: string; typeCode?: string } = {};
      const qb: any = {
        orderBy: jest.fn(() => qb),
        andWhere: jest.fn((expr: string, params: any) => {
          if (expr.includes('o.status')) filters.status = params.s;
          if (expr.includes('customer_id')) filters.customerId = params.cid;
          if (expr.includes('type_code')) filters.typeCode = params.t;
          return qb;
        }),
        skip: jest.fn(() => qb),
        take: jest.fn(() => qb),
        getCount: jest.fn(async () => filterOrders(w.orders, filters).length),
        getMany: jest.fn(async () => filterOrders(w.orders, filters)),
        select: jest.fn(() => qb),
        addSelect: jest.fn(() => qb),
        groupBy: jest.fn(() => qb),
        getRawMany: jest.fn(async () => {
          const map = new Map<string, { count: number; amount: bigint }>();
          for (const o of w.orders) {
            const cur = map.get(o.status) ?? { count: 0, amount: 0n };
            map.set(o.status, { count: cur.count + 1, amount: cur.amount + BigInt(o.payableAmount) });
          }
          return Array.from(map.entries()).map(([status, v]) => ({
            status,
            count: String(v.count),
            amount: v.amount.toString(),
          }));
        }),
      };
      return qb;
    }),
  };
  const detailRepo: any = {
    findOne: jest.fn(async (opt: any) => w.details.find((d) => d.errandOrderId === opt.where.errandOrderId) ?? null),
  };
  const timelineRepo: any = {
    find: jest.fn(async () => w.timelines),
  };
  const taskRepo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.errandOrderId === opt.where.errandOrderId) ?? null),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new AdminErrandOrderService(orderRepo, detailRepo, timelineRepo, taskRepo);
}

function filterOrders(orders: ErrandOrder[], f: { status?: string; customerId?: string; typeCode?: string }) {
  let r = orders;
  if (f.status) r = r.filter((o) => o.status === f.status);
  if (f.customerId) r = r.filter((o) => o.customerId === f.customerId);
  if (f.typeCode) r = r.filter((o) => o.typeCode === f.typeCode);
  return r;
}

describe('AdminErrandOrderService', () => {
  it('list 默认无 filter 返全部', async () => {
    const w: World = {
      orders: [makeOrder({}), makeOrder({ errandOrderId: '600002' })],
      details: [],
      timelines: [],
      tasks: [],
    };
    const svc = buildService(w);
    const r = await svc.list({});
    expect(r.total).toBe(2);
  });

  it('list status filter', async () => {
    const w: World = {
      orders: [
        makeOrder({}),
        makeOrder({ errandOrderId: '2', status: 'PAID' }),
        makeOrder({ errandOrderId: '3', status: 'CANCELLED' }),
      ],
      details: [],
      timelines: [],
      tasks: [],
    };
    const svc = buildService(w);
    const r = await svc.list({ status: 'CANCELLED' });
    expect(r.total).toBe(1);
  });

  it('list typeCode filter', async () => {
    const w: World = {
      orders: [makeOrder({ typeCode: 'BUY' }), makeOrder({ errandOrderId: '2', typeCode: 'DELIVER' })],
      details: [],
      timelines: [],
      tasks: [],
    };
    const svc = buildService(w);
    const r = await svc.list({ typeCode: 'DELIVER' });
    expect(r.total).toBe(1);
  });

  it('detail 不存在 → DATA_NOT_FOUND', async () => {
    const w: World = { orders: [], details: [], timelines: [], tasks: [] };
    const svc = buildService(w);
    await expect(svc.detail('xxx')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('detail 含 timeline + task', async () => {
    const w: World = {
      orders: [makeOrder({})],
      details: [{ errandOrderId: '600001', distanceMeters: 1500 } as unknown as ErrandOrderDetail],
      timelines: [
        {
          errandOrderId: '600001',
          eventType: 'CREATED',
          operator: 'customer',
          payload: null,
          createdAt: '100',
        } as unknown as ErrandTimeline,
      ],
      tasks: [
        {
          errandTaskId: 'T1',
          errandOrderId: '600001',
          riderId: '5001',
          status: 'ASSIGNED',
          dispatchCount: 0,
          priceIncrease: '0',
        } as unknown as ErrandTask,
      ],
    };
    const svc = buildService(w);
    const r = await svc.detail('600001');
    expect(r.timeline).toHaveLength(1);
    expect(r.task?.taskId).toBe('T1');
  });

  it('stats 按状态聚合', async () => {
    const w: World = {
      orders: [
        makeOrder({ status: 'WAIT_PAY' }),
        makeOrder({ errandOrderId: '2', status: 'PAID' }),
        makeOrder({ errandOrderId: '3', status: 'PAID' }),
        makeOrder({ errandOrderId: '4', status: 'CANCELLED' }),
      ],
      details: [],
      timelines: [],
      tasks: [],
    };
    const svc = buildService(w);
    const r = await svc.stats();
    expect(r.totalCount).toBe(4);
    expect(r.paidCount).toBe(2);
    expect(r.cancelledCount).toBe(1);
  });
});
