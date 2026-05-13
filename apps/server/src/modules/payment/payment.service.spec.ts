import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type {
  FoodOrder,
  OrderTimeline,
  PaymentOrder,
  ProductSku,
  StockLock,
  StockRecord,
} from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { ParsedPayCallback } from '../integration-gateway/adapters/wxpay.adapter';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';

import { PaymentService } from './payment.service';

class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string, _ex?: string, _ttl?: number, mode?: string): Promise<'OK' | null> {
    if (mode === 'NX') {
      if (this.store.has(key)) return null;
    }
    this.store.set(key, val);
    return 'OK';
  }
}

interface World {
  orders: FoodOrder[];
  payments: PaymentOrder[];
  skus: ProductSku[];
  stockLocks: StockLock[];
  stockRecords: StockRecord[];
  timelines: OrderTimeline[];
  publishedEvents: Array<{ name: string; payload: unknown }>;
  redis: FakeRedis;
  parseResult: ParsedPayCallback | null;
}

function buildService(w: World): PaymentService {
  let nextPayId = 800001;

  const orderRepo = {
    findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
      Promise.resolve(w.orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
    ),
  } as unknown as jest.Mocked<Repository<FoodOrder>>;

  const payRepo = {
    findOne: jest.fn(({ where }: { where: Partial<PaymentOrder> }) =>
      Promise.resolve(
        w.payments.find(
          (p) =>
            (where.paymentOrderId ? p.paymentOrderId === where.paymentOrderId : true) &&
            (where.bizId ? p.bizId === where.bizId : true) &&
            (where.payChannel ? p.payChannel === where.payChannel : true) &&
            (where.payOrderNo ? p.payOrderNo === where.payOrderNo : true) &&
            (where.status ? p.status === where.status : true),
        ) ?? null,
      ),
    ),
    insert: jest.fn(async (rec: Partial<PaymentOrder>) => {
      const id = String(nextPayId++);
      w.payments.push({ ...(rec as PaymentOrder), paymentOrderId: id });
      return { identifiers: [{ paymentOrderId: id }], generatedMaps: [], raw: [] };
    }),
  } as unknown as jest.Mocked<Repository<PaymentOrder>>;

  const gateway = {
    wxpay: {
      createPrepay: jest
        .fn()
        .mockResolvedValue({ prepayId: 'wx-mock', payParams: '{"appId":"wx_mock_app","paySign":"mock-pay-sign"}' }),
      parseCallback: jest.fn().mockImplementation(() => w.parseResult),
    },
    alipay: {
      createPrepay: jest
        .fn()
        .mockResolvedValue({ tradeNo: 'al-mock', payUrl: 'x', payParams: 'app_id=alipay_mock_app&sign=mock' }),
      parseCallback: jest.fn().mockImplementation(() => w.parseResult),
    },
  } as unknown as IntegrationGatewayService;

  const fakeEm: Partial<EntityManager> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getRepository: jest.fn().mockImplementation((entity: any) => {
      const name: string = entity?.name ?? '';
      if (name === 'PaymentOrder') {
        return {
          update: jest.fn(async (criteria: Partial<PaymentOrder>, patch: Partial<PaymentOrder>) => {
            const idx = w.payments.findIndex((p) => p.paymentOrderId === criteria.paymentOrderId);
            if (idx >= 0) w.payments[idx] = { ...w.payments[idx]!, ...patch };
            return { affected: 1, raw: [] };
          }),
        };
      }
      if (name === 'FoodOrder') {
        return {
          findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
            Promise.resolve(w.orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
          ),
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
          decrement: jest.fn(async (criteria: { skuId: string }, field: 'stock' | 'stockLocked', by: number) => {
            const sku = w.skus.find((s) => s.skuId === criteria.skuId);
            if (sku) {
              if (field === 'stock') sku.stock -= by;
              else sku.stockLocked -= by;
            }
            return { affected: 1, raw: [] };
          }),
          findOne: jest.fn(({ where }: { where: Partial<ProductSku> }) =>
            Promise.resolve(w.skus.find((s) => s.skuId === where.skuId) ?? null),
          ),
        };
      }
      if (name === 'StockRecord') {
        return {
          insert: jest.fn(async (rec: Partial<StockRecord>) => {
            w.stockRecords.push(rec as StockRecord);
            return { identifiers: [], generatedMaps: [], raw: [] };
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
  const dataSource = {
    transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => cb(fakeEm as EntityManager)),
  } as unknown as jest.Mocked<DataSource>;
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.publishedEvents.push({ name, payload });
      return { eventId: 'evt' };
    }),
  } as unknown as jest.Mocked<DomainEventBus>;

  // stage 6: 注入 ErrandOrder repo(测试时只用 FOOD 路径,空 stub 即可)
  const errandOrderRepo = {
    findOne: jest.fn(async () => null),
  } as unknown as Repository<import('../../database/entities').ErrandOrder>;

  const couponService = {
    lockCoupons: jest.fn(async () => undefined),
    releaseCoupons: jest.fn(async () => 0),
    consumeCoupons: jest.fn(async () => 0),
  } as unknown as never;

  const adminRefundService = {
    createFromArbitration: jest.fn(async () => ({ refundOrderId: 'r1' })),
  } as unknown as never;

  const groceryOrderRepo = {
    findOne: jest.fn(async () => null),
  } as unknown as Repository<import('../../database/entities').GroceryOrder>;

  return new PaymentService(
    orderRepo,
    payRepo,
    errandOrderRepo,
    groceryOrderRepo,
    gateway,
    dataSource,
    eventBus,
    w.redis as unknown as never,
    couponService,
    adminRefundService,
  );
}

function makeWorld(): World {
  return {
    orders: [
      {
        foodOrderId: '700001',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        payableAmount: '5900',
        expireAt: String(Date.now() + 10 * 60 * 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        customerId: '10001',
        storeId: '20001',
        status: 'PAID_WAIT_MERCHANT',
        payableAmount: '5900',
        expireAt: String(Date.now() + 10 * 60 * 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700003',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        payableAmount: '5900',
        expireAt: String(Date.now() - 10 * 60 * 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700004',
        customerId: '99999',
        storeId: '20001',
        status: 'WAIT_PAY',
        payableAmount: '5900',
        expireAt: String(Date.now() + 10 * 60 * 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700005',
        customerId: '10001',
        storeId: '20001',
        status: 'WAIT_PAY',
        payableAmount: '5900',
        expireAt: String(Date.now() + 10 * 60 * 1000),
      } as unknown as FoodOrder,
    ],
    payments: [],
    skus: [{ skuId: '9011', productId: '901', stock: 50, stockLocked: 2 } as unknown as ProductSku],
    stockLocks: [],
    stockRecords: [],
    timelines: [],
    publishedEvents: [],
    redis: new FakeRedis(),
    parseResult: null,
  };
}

describe('PaymentService.prepay', () => {
  let svc: PaymentService;
  let world: World;
  beforeEach(() => {
    world = makeWorld();
    svc = buildService(world);
  });

  it('wxpay 成功 → 写 payment_order pending + 返 payParams', async () => {
    const r = await svc.prepay('10001', { bizType: 'FOOD', orderId: '700001', payChannel: 'wxpay' });
    expect(r.payOrderId).toBeTruthy();
    expect(r.payOrderNo.startsWith('P')).toBe(true);
    expect(r.payParams).toContain('wx_mock_app');
    expect(world.payments).toHaveLength(1);
  });

  it('alipay 成功 → payParams 字符串', async () => {
    const r = await svc.prepay('10001', { bizType: 'FOOD', orderId: '700001', payChannel: 'alipay' });
    expect(r.payParams).toContain('alipay_mock_app');
  });

  it('订单不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.prepay('10001', { bizType: 'FOOD', orderId: '999999', payChannel: 'wxpay' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('订单不属本人 → DATA_NOT_FOUND', async () => {
    await expect(svc.prepay('10001', { bizType: 'FOOD', orderId: '700004', payChannel: 'wxpay' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('订单非 WAIT_PAY → STATUS_INVALID ORDER_NOT_PAYABLE', async () => {
    await expect(svc.prepay('10001', { bizType: 'FOOD', orderId: '700002', payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('订单已过期 → STATUS_INVALID ORDER_EXPIRED', async () => {
    await expect(svc.prepay('10001', { bizType: 'FOOD', orderId: '700003', payChannel: 'wxpay' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('幂等:同 orderId+channel 二次调 → 复用已 pending payment_order(不新建)', async () => {
    const r1 = await svc.prepay('10001', { bizType: 'FOOD', orderId: '700001', payChannel: 'wxpay' });
    const r2 = await svc.prepay('10001', { bizType: 'FOOD', orderId: '700001', payChannel: 'wxpay' });
    expect(r2.payOrderId).toBe(r1.payOrderId);
    expect(world.payments).toHaveLength(1);
  });
});

describe('PaymentService.handleCallback', () => {
  let svc: PaymentService;
  let world: World;

  beforeEach(() => {
    world = makeWorld();
    // 预置 payment_order pending + stock_lock active
    world.payments.push({
      paymentOrderId: '800999',
      payOrderNo: 'P20260506100000000999',
      bizType: 'FOOD',
      bizId: '700005',
      payChannel: 'wxpay',
      payableAmount: '5900',
      paidAmount: null,
      status: 'pending',
      channelTradeNo: null,
      callbackRaw: null,
      retryCount: 0,
      expireAt: String(Date.now() + 10 * 60 * 1000),
      paidAt: null,
      createdAt: String(Date.now() - 1000),
      updatedAt: String(Date.now() - 1000),
    } as unknown as PaymentOrder);
    world.stockLocks.push({
      stockLockId: '900001',
      orderId: '700005',
      skuId: '9011',
      quantity: 2,
      status: 'active',
      createdAt: String(Date.now()),
      releasedAt: null,
    } as unknown as StockLock);
    svc = buildService(world);
  });

  it('wxpay 成功回调 → payment success + order PAID_WAIT_MERCHANT + stock_lock consumed + sku.stock 减 + 双事件', async () => {
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'wx_real_xyz',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    const r = await svc.handleCallback('wxpay', '{}', 'mock-sign');
    expect(r).toEqual({ ok: true });
    expect(world.payments[0]!.status).toBe('success');
    expect(world.payments[0]!.channelTradeNo).toBe('wx_real_xyz');
    expect(world.orders.find((o) => o.foodOrderId === '700005')!.status).toBe('PAID_WAIT_MERCHANT');
    expect(world.stockLocks[0]!.status).toBe('consumed');
    expect(world.skus[0]!.stock).toBe(48); // 50 - 2
    expect(world.skus[0]!.stockLocked).toBe(0); // 2 - 2
    expect(world.stockRecords).toHaveLength(1);
    expect(world.stockRecords[0]!.reason).toBe('ORDER_PAID');
    expect(world.timelines).toHaveLength(1);
    expect(world.timelines[0]!.fromStatus).toBe('WAIT_PAY');
    expect(world.timelines[0]!.toStatus).toBe('PAID_WAIT_MERCHANT');
    expect(world.publishedEvents.map((e) => e.name)).toEqual([EventName.PaymentSucceeded, EventName.FoodOrderPaid]);
  });

  it('alipay 成功回调 → 同样路径(只 channel 不同)', async () => {
    world.payments[0]!.payChannel = 'alipay';
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'alipay_yyy',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    const r = await svc.handleCallback('alipay', '{}', 'mock-sign');
    expect(r.ok).toBe(true);
    expect(world.payments[0]!.channelTradeNo).toBe('alipay_yyy');
  });

  it('验签失败(parseCallback 返 null)→ THIRD_PARTY_ERROR', async () => {
    world.parseResult = null;
    await expect(svc.handleCallback('wxpay', '{}', 'wrong-sign')).rejects.toThrow(UnprocessableEntityException);
  });

  it('重复回调:payment 已 success → duplicate=true,不重复发事件', async () => {
    world.payments[0]!.status = 'success';
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'wx_real_xyz',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    const r = await svc.handleCallback('wxpay', '{}', 'mock-sign');
    expect(r).toEqual({ ok: true, duplicate: true });
    expect(world.publishedEvents).toHaveLength(0);
  });

  it('nonce 防重放:同 outTradeNo+channelTradeNo 第二次 → duplicate', async () => {
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'wx_real_xyz',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    await svc.handleCallback('wxpay', '{}', 'mock-sign');
    const r2 = await svc.handleCallback('wxpay', '{}', 'mock-sign');
    expect(r2).toEqual({ ok: true, duplicate: true });
  });

  it('payment_order 不存在 → DATA_NOT_FOUND', async () => {
    world.parseResult = {
      outTradeNo: 'P_NOT_EXIST',
      channelTradeNo: 'x',
      paidAmountCents: 0,
      paidAt: Date.now(),
      raw: '{}',
    };
    await expect(svc.handleCallback('wxpay', '{}', 'mock-sign')).rejects.toThrow(NotFoundException);
  });

  it('payment_order 状态非 pending 也非 success(如 expired)→ STATUS_INVALID', async () => {
    world.payments[0]!.status = 'expired';
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'wx_real_xyz',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    await expect(svc.handleCallback('wxpay', '{}', 'mock-sign')).rejects.toThrow(UnprocessableEntityException);
  });

  it('order 已被 15min job 提前关单 → payment 仍 success 但不推进订单状态,不发 FoodOrderPaid', async () => {
    world.orders.find((o) => o.foodOrderId === '700005')!.status = 'CANCELLED';
    world.parseResult = {
      outTradeNo: 'P20260506100000000999',
      channelTradeNo: 'wx_real_xyz',
      paidAmountCents: 5900,
      paidAt: Date.now(),
      raw: '{}',
    };
    const r = await svc.handleCallback('wxpay', '{}', 'mock-sign');
    expect(r.ok).toBe(true);
    expect(world.payments[0]!.status).toBe('success');
    expect(world.orders.find((o) => o.foodOrderId === '700005')!.status).toBe('CANCELLED');
    // 仅 PaymentSucceeded 发出,不发 FoodOrderPaid
    expect(world.publishedEvents.map((e) => e.name)).toEqual([EventName.PaymentSucceeded]);
  });
});
