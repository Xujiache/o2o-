import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import type {
  ErrandAttachment,
  ErrandOrder,
  ErrandOrderDetail,
  ErrandTask,
  ErrandTimeline,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { IntegrationGatewayService } from '../../modules/integration-gateway/integration-gateway.service';
import type { ErrandPricingService } from '../errand-pricing/errand-pricing.service';
import type { ErrandTypeService } from '../errand-type/errand-type.service';
import type { PaymentService } from '../payment/payment.service';
import type { ProhibitedItemService } from '../prohibited-item/prohibited-item.service';

import { ErrandOrderService } from './errand-order.service';

interface World {
  orders: ErrandOrder[];
  details: ErrandOrderDetail[];
  attachments: ErrandAttachment[];
  timelines: ErrandTimeline[];
  tasks: ErrandTask[];
  events: { name: string; payload: unknown }[];
}

function makeOrder(overrides: Partial<ErrandOrder> = {}): ErrandOrder {
  const now = Date.now();
  return {
    errandOrderId: '600001',
    orderNo: 'E20260506000001',
    customerId: '10001',
    typeCode: 'BUY',
    status: 'WAIT_PAY',
    payStatus: 'unpaid',
    payOrderId: null,
    baseFee: '500',
    distanceFee: '100',
    urgentFee: '0',
    budget: '5000',
    payableAmount: '600',
    paidAmount: null,
    urgentLevel: 'standard',
    reservedTime: null,
    expireAt: String(now + 600_000),
    paidAt: null,
    dispatchingAt: null,
    cancelledAt: null,
    cancelledBy: null,
    cancelReason: null,
    completedAt: null,
    createdAt: String(now),
    updatedAt: String(now),
    ...overrides,
  } as ErrandOrder;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.errandOrderId === opt.where.errandOrderId) ?? null),
    update: jest.fn(async (where: any, set: any) => {
      const o = w.orders.find((x) => x.errandOrderId === where.errandOrderId);
      if (o) Object.assign(o, set);
      return { affected: 1, raw: [] };
    }),
    createQueryBuilder: jest.fn(() => {
      const filters: { customerId?: string; statuses?: string[] } = {};
      const qb: any = {
        where: jest.fn((expr: string, params: any) => {
          if (expr.includes('customer_id')) filters.customerId = params.cid;
          return qb;
        }),
        andWhere: jest.fn((expr: string, params: any) => {
          if (expr.includes('o.status IN')) filters.statuses = params.s;
          else if (expr.includes('o.status =')) filters.statuses = [params.s];
          return qb;
        }),
        orderBy: jest.fn(() => qb),
        skip: jest.fn(() => qb),
        take: jest.fn(() => qb),
        getCount: jest.fn(async () => filterOrders(w.orders, filters).length),
        getMany: jest.fn(async () => filterOrders(w.orders, filters)),
      };
      return qb;
    }),
  };
  const detailRepo: any = {
    findOne: jest.fn(async (opt: any) => w.details.find((d) => d.errandOrderId === opt.where.errandOrderId) ?? null),
    find: jest.fn(async (opt: any) => {
      const ids = (opt.where.errandOrderId as { _value?: unknown })._value ?? opt.where.errandOrderId;
      const idArr = Array.isArray(ids) ? ids : [ids];
      return w.details.filter((d) => idArr.includes(d.errandOrderId));
    }),
  };
  const attachmentRepo: any = {
    find: jest.fn(async (opt: any) =>
      w.attachments.filter((a) => a.errandOrderId === opt.where.errandOrderId).sort((a, b) => a.sort - b.sort),
    ),
  };
  const timelineRepo: any = {
    find: jest.fn(async (opt: any) =>
      w.timelines
        .filter((t) => t.errandOrderId === opt.where.errandOrderId)
        .sort((a, b) => Number(a.createdAt) - Number(b.createdAt)),
    ),
  };
  const taskRepo: any = {
    findOne: jest.fn(async (opt: any) => w.tasks.find((t) => t.errandOrderId === opt.where.errandOrderId) ?? null),
  };
  const typeSvc = {} as unknown as jest.Mocked<ErrandTypeService>;
  const pricingSvc = {
    calc: jest.fn(async (input: { urgentLevel: string }) => {
      const m: Record<string, string> = { standard: '0', fast: '500', express: '1000' };
      return {
        baseFee: '500',
        distanceFee: '100',
        urgentFee: m[input.urgentLevel] ?? '0',
        payableAmount: String(600 + Number(m[input.urgentLevel] ?? '0')),
      };
    }),
  } as unknown as jest.Mocked<ErrandPricingService>;
  const prohibitedSvc = {} as unknown as jest.Mocked<ProhibitedItemService>;
  const gateway = {
    amap: {
      route: jest.fn(async () => ({
        totalDistanceMeters: 1500,
        etaMs: 215_000,
        points: [
          { lng: 1, lat: 1, distanceFromStart: 0 },
          { lng: 2, lat: 2, distanceFromStart: 1500 },
        ],
      })),
    },
  } as unknown as jest.Mocked<IntegrationGatewayService>;
  const paymentSvc = {} as unknown as jest.Mocked<PaymentService>;
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e' };
    }),
  } as unknown as jest.Mocked<DomainEventBus>;

  function emRepo(name: string): any {
    if (name === 'ErrandOrder') {
      return {
        update: orderRepo.update,
      };
    }
    if (name === 'ErrandOrderDetail') {
      return {
        update: jest.fn(async (where: any, set: any) => {
          const d = w.details.find((x) => x.errandOrderId === where.errandOrderId);
          if (d) Object.assign(d, set);
          return { affected: 1, raw: [] };
        }),
      };
    }
    if (name === 'ErrandAttachment') {
      return {
        insert: jest.fn(async (data: any) => {
          w.attachments.push(data as ErrandAttachment);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
        createQueryBuilder: jest.fn(() => {
          const qb: any = {
            where: jest.fn(() => qb),
            orderBy: jest.fn(() => qb),
            getOne: jest.fn(async () =>
              w.attachments.length > 0 ? w.attachments.reduce((a, b) => (a.sort > b.sort ? a : b)) : null,
            ),
          };
          return qb;
        }),
      };
    }
    if (name === 'ErrandTimeline') {
      return {
        insert: jest.fn(async (data: any) => {
          w.timelines.push(data as ErrandTimeline);
          return { identifiers: [], generatedMaps: [], raw: [] };
        }),
      };
    }
    return {};
  }

  const emWrap = { getRepository: (entity: { name: string }) => emRepo(entity.name) };
  const dataSource: any = {
    transaction: jest.fn(async (cb: any) => cb(emWrap)),
  };
  const redis: any = { set: jest.fn(), incr: jest.fn(), expire: jest.fn() };
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return new ErrandOrderService(
    {} as any,
    orderRepo,
    detailRepo,
    attachmentRepo,
    timelineRepo,
    taskRepo,
    typeSvc,
    pricingSvc,
    prohibitedSvc,
    gateway,
    paymentSvc,
    eventBus,
    dataSource,
    redis,
  );
  /* eslint-disable @typescript-eslint/no-explicit-any */
}

function filterOrders(orders: ErrandOrder[], f: { customerId?: string; statuses?: string[] }): ErrandOrder[] {
  let r = orders;
  if (f.customerId) r = r.filter((o) => o.customerId === f.customerId);
  if (f.statuses) r = r.filter((o) => f.statuses!.includes(o.status));
  return r;
}

function makeWorld(): World {
  return { orders: [], details: [], attachments: [], timelines: [], tasks: [], events: [] };
}

describe('ErrandOrderService.list (T11)', () => {
  it('返本人订单 + 分页 + 排序', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ errandOrderId: '1', createdAt: '100' }));
    w.orders.push(makeOrder({ errandOrderId: '2', createdAt: '200' }));
    w.orders.push(makeOrder({ errandOrderId: '3', customerId: '99999' }));
    const svc = buildService(w);
    const r = await svc.list('10001', { page: 1, pageSize: 10 });
    expect(r.total).toBe(2);
    expect(r.list).toHaveLength(2);
  });

  it('IN_PROGRESS tab 含 PAID/DISPATCHING/ASSIGNED/PICKED_UP/DELIVERED', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ errandOrderId: '1', status: 'WAIT_PAY' }));
    w.orders.push(makeOrder({ errandOrderId: '2', status: 'PAID' }));
    w.orders.push(makeOrder({ errandOrderId: '3', status: 'CANCELLED' }));
    const svc = buildService(w);
    const r = await svc.list('10001', { status: 'IN_PROGRESS' });
    expect(r.total).toBe(1);
    expect(r.list[0]!.orderId).toBe('2');
  });

  it('WAIT_PAY tab 仅含 WAIT_PAY', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ errandOrderId: '1', status: 'WAIT_PAY' }));
    w.orders.push(makeOrder({ errandOrderId: '2', status: 'COMPLETED' }));
    const svc = buildService(w);
    const r = await svc.list('10001', { status: 'WAIT_PAY' });
    expect(r.total).toBe(1);
  });
});

describe('ErrandOrderService.detail (T12)', () => {
  it('返完整 detail + timeline + actions', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID' }));
    w.details.push({
      errandOrderId: '600001',
      pickupAddress: { address: 'A' },
      deliveryAddress: { address: 'B' },
      itemDesc: '咖啡',
      taskDesc: null,
      weight: null,
      distanceMeters: 1500,
      remark: null,
      createdAt: '0',
      updatedAt: '0',
    } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    const r = await svc.detail('10001', '600001');
    expect(r.orderId).toBe('600001');
    expect(r.actions).toContain('urgent');
    expect(r.actions).toContain('track');
  });

  it('订单不存在 → DATA_NOT_FOUND', async () => {
    const w = makeWorld();
    const svc = buildService(w);
    await expect(svc.detail('10001', 'xxx')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actions 跟随状态变化', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'WAIT_PAY' }));
    const svc = buildService(w);
    const r = await svc.detail('10001', '600001');
    expect(r.actions).toEqual(['pay', 'cancel']);
  });
});

describe('ErrandOrderService.cancel (T13)', () => {
  it('WAIT_PAY 主动取消成功 → CANCELLED + timeline', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder());
    const svc = buildService(w);
    const r = await svc.cancel('10001', '600001', { reason: '不想要了' });
    expect(r.status).toBe('CANCELLED');
    expect(w.orders[0]!.status).toBe('CANCELLED');
    expect(w.orders[0]!.cancelledBy).toBe('customer');
    expect(w.timelines).toHaveLength(1);
  });

  it('非 WAIT_PAY 状态 → STATUS_INVALID', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID' }));
    const svc = buildService(w);
    await expect(svc.cancel('10001', '600001', {})).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('非本人 → DATA_NOT_FOUND', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder());
    const svc = buildService(w);
    await expect(svc.cancel('99999', '600001', {})).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ErrandOrderService.urgent (T14)', () => {
  it('standard → fast 成功 + ErrandPriceIncreased 事件', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID', urgentLevel: 'standard', urgentFee: '0' }));
    w.details.push({
      errandOrderId: '600001',
      distanceMeters: 1500,
      weight: null,
      pickupAddress: null,
      deliveryAddress: { address: 'B' },
      itemDesc: null,
      taskDesc: null,
      remark: null,
      createdAt: '0',
      updatedAt: '0',
    } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    const r = await svc.urgent('10001', '600001', { urgentLevel: 'fast', confirmFee: 500 });
    expect(r.urgentLevel).toBe('fast');
    expect(r.urgentFee).toBe('500');
    expect(w.events.find((e) => e.name === 'domain.errand-order.price-increased')).toBeDefined();
  });

  it('未变化 → STATUS_INVALID', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID', urgentLevel: 'fast', urgentFee: '500' }));
    w.details.push({ errandOrderId: '600001', distanceMeters: 0 } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    await expect(svc.urgent('10001', '600001', { urgentLevel: 'fast', confirmFee: 0 })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('降级 → STATUS_INVALID', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID', urgentLevel: 'express', urgentFee: '1000' }));
    w.details.push({ errandOrderId: '600001', distanceMeters: 0 } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    await expect(svc.urgent('10001', '600001', { urgentLevel: 'fast', confirmFee: 0 })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('confirmFee 漂移 → STATUS_INVALID', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID', urgentLevel: 'standard', urgentFee: '0' }));
    w.details.push({ errandOrderId: '600001', distanceMeters: 0 } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    await expect(svc.urgent('10001', '600001', { urgentLevel: 'fast', confirmFee: 999 })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('状态 WAIT_PAY 不可加急', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'WAIT_PAY' }));
    const svc = buildService(w);
    await expect(svc.urgent('10001', '600001', { urgentLevel: 'fast', confirmFee: 500 })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});

describe('ErrandOrderService.remark (T15)', () => {
  it('补备注成功 + ErrandRemarkAdded 事件', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID' }));
    w.details.push({ errandOrderId: '600001' } as unknown as ErrandOrderDetail);
    const svc = buildService(w);
    const r = await svc.remark('10001', '600001', { remark: '请按门铃' });
    expect(r.latestRemark).toBe('请按门铃');
    expect(w.events.find((e) => e.name === 'domain.errand-order.remark-added')).toBeDefined();
  });

  it('附件追加 sort 起始(已有 sort=2 时 → +3)', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'PAID' }));
    w.details.push({ errandOrderId: '600001' } as unknown as ErrandOrderDetail);
    w.attachments.push({ errandOrderId: '600001', sort: 2 } as ErrandAttachment);
    const svc = buildService(w);
    await svc.remark('10001', '600001', { remark: 'r', attachments: ['9001'] });
    const newAtt = w.attachments.find((a) => a.fileId === '9001');
    expect(newAtt?.sort).toBe(3);
  });

  it('CANCELLED 不可补备注', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'CANCELLED' }));
    const svc = buildService(w);
    await expect(svc.remark('10001', '600001', { remark: 'r' })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});

describe('ErrandOrderService.track (T16)', () => {
  it('未接单 → riderLocation/route null', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'DISPATCHING' }));
    const svc = buildService(w);
    const r = await svc.track('10001', '600001');
    expect(r.riderLocation).toBeNull();
    expect(r.route).toBeNull();
    expect(r.trackPoints).toEqual([]);
  });

  it('已 ASSIGNED + 有坐标 → route 起点+终点+eta', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'ASSIGNED' }));
    w.tasks.push({
      errandOrderId: '600001',
      status: 'ASSIGNED',
      pickupAddress: { address: 'A', lng: 116.4, lat: 39.9 },
      deliveryAddress: { address: 'B', lng: 116.5, lat: 39.9 },
    } as unknown as ErrandTask);
    const svc = buildService(w);
    const r = await svc.track('10001', '600001');
    expect(r.route).not.toBeNull();
    expect(r.trackPoints).toHaveLength(2);
  });

  it('坐标缺失 → fallback null route', async () => {
    const w = makeWorld();
    w.orders.push(makeOrder({ status: 'ASSIGNED' }));
    w.tasks.push({
      errandOrderId: '600001',
      status: 'ASSIGNED',
      pickupAddress: { address: 'A' }, // 无坐标
      deliveryAddress: { address: 'B' },
    } as unknown as ErrandTask);
    const svc = buildService(w);
    const r = await svc.track('10001', '600001');
    expect(r.route).toBeNull();
  });
});
