import type { ErrandOrder, ErrandOrderDetail, ErrandTask } from '../../database/entities';

import { ErrandDispatchService } from './errand-dispatch.service';

interface World {
  orders: ErrandOrder[];
  tasks: ErrandTask[];
  details: ErrandOrderDetail[];
  timelines: { errandOrderId: string; eventType: string; payload: unknown }[];
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.errandOrderId === opt.where.errandOrderId) ?? null),
  };
  const taskRepo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.errandOrderId === opt.where.errandOrderId) ?? null),
  };

  function emRepo(name: string): any {
    if (name === 'ErrandTask') {
      return {
        insert: jest.fn(async (data: any) => {
          const id = String(w.tasks.length + 1);
          w.tasks.push({ ...data, errandTaskId: id } as ErrandTask);
          return { identifiers: [{ errandTaskId: id }], generatedMaps: [], raw: [] };
        }),
        findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.errandTaskId === opt.where.errandTaskId) ?? null),
      };
    }
    if (name === 'ErrandOrder') {
      return {
        update: jest.fn(async (where: any, set: any) => {
          const o = w.orders.find((x) => x.errandOrderId === where.errandOrderId);
          if (o) Object.assign(o, set);
          return { affected: 1, raw: [] };
        }),
      };
    }
    if (name === 'ErrandTimeline') {
      return {
        insert: jest.fn(async (data: any) => {
          w.timelines.push({
            errandOrderId: data.errandOrderId,
            eventType: data.eventType,
            payload: data.payload,
          });
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    if (name === 'ErrandOrderDetail') {
      return {
        findOne: jest.fn(
          async (opt: any) => w.details.find((d) => d.errandOrderId === opt.where.errandOrderId) ?? null,
        ),
      };
    }
    return {};
  }

  const emWrap = { getRepository: (entity: { name: string }) => emRepo(entity.name) };
  const dataSource: any = {
    getRepository: jest.fn((entity: { name: string }) => emRepo(entity.name)),
    transaction: jest.fn(async (cb: any) => cb(emWrap)),
  };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ErrandDispatchService(orderRepo, taskRepo, dataSource);
}

function makeOrder(id: string, status: ErrandOrder['status']): ErrandOrder {
  return {
    errandOrderId: id,
    customerId: '10001',
    status,
  } as unknown as ErrandOrder;
}

describe('ErrandDispatchService.createTask', () => {
  it('PAID 订单 → 创建 task READY_FOR_DISPATCH + 推进 DISPATCHING + timeline', async () => {
    const w: World = {
      orders: [makeOrder('600001', 'PAID')],
      tasks: [],
      details: [
        {
          errandOrderId: '600001',
          deliveryAddress: { address: 'X' },
          distanceMeters: 1500,
        } as unknown as ErrandOrderDetail,
      ],
      timelines: [],
    };
    const svc = buildService(w);
    const t = await svc.createTask('600001');
    expect(t.status).toBe('READY_FOR_DISPATCH');
    expect(w.orders[0]!.status).toBe('DISPATCHING');
    expect(w.timelines).toHaveLength(1);
    expect(w.timelines[0]!.eventType).toBe('DISPATCHING');
  });

  it('已存在 task 直接返不重复创建(幂等)', async () => {
    const existing = {
      errandTaskId: '999',
      errandOrderId: '600001',
      status: 'ASSIGNED',
    } as unknown as ErrandTask;
    const w: World = {
      orders: [makeOrder('600001', 'DISPATCHING')],
      tasks: [existing],
      details: [],
      timelines: [],
    };
    const svc = buildService(w);
    const t = await svc.createTask('600001');
    expect(t).toBe(existing);
    expect(w.tasks).toHaveLength(1);
    expect(w.timelines).toHaveLength(0);
  });

  it('订单不存在 → DATA_NOT_FOUND', async () => {
    const w: World = { orders: [], tasks: [], details: [], timelines: [] };
    const svc = buildService(w);
    await expect(svc.createTask('xxx')).rejects.toThrow();
  });

  it('订单 WAIT_PAY → 状态非法', async () => {
    const w: World = {
      orders: [makeOrder('600001', 'WAIT_PAY')],
      tasks: [],
      details: [],
      timelines: [],
    };
    const svc = buildService(w);
    await expect(svc.createTask('600001')).rejects.toThrow();
  });

  it('订单 DISPATCHING(重入) → 不再写 timeline 但创任务', async () => {
    const w: World = {
      orders: [makeOrder('600001', 'DISPATCHING')],
      tasks: [],
      details: [],
      timelines: [],
    };
    const svc = buildService(w);
    const t = await svc.createTask('600001');
    expect(t.status).toBe('READY_FOR_DISPATCH');
    expect(w.timelines).toHaveLength(0); // 没再写 DISPATCHING
  });

  it('detail 缺失时 deliveryAddress fallback 占位', async () => {
    const w: World = {
      orders: [makeOrder('600001', 'PAID')],
      tasks: [],
      details: [], // 无 detail
      timelines: [],
    };
    const svc = buildService(w);
    const t = await svc.createTask('600001');
    expect(t.deliveryAddress.address).toBe('(empty)');
  });

  it('source=reserved 写入 timeline payload', async () => {
    const w: World = {
      orders: [makeOrder('600001', 'PAID')],
      tasks: [],
      details: [],
      timelines: [],
    };
    const svc = buildService(w);
    await svc.createTask('600001', 'reserved');
    expect((w.timelines[0]!.payload as { source: string }).source).toBe('reserved');
  });
});
