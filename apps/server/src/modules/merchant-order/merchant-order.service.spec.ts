import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { FoodOrder, MerchantOrderActionLog, Store } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';

import { MerchantOrderService } from './merchant-order.service';

interface World {
  orders: FoodOrder[];
  stores: Store[];
  actionLogs: MerchantOrderActionLog[];
  events: { name: string; payload: unknown }[];
}

function makeOrder(overrides: Partial<FoodOrder> = {}): FoodOrder {
  const now = Date.now();
  return {
    foodOrderId: '510001',
    orderNo: 'F20260506000001',
    customerId: '10001',
    storeId: '20001',
    cityCode: '110100',
    status: 'PAID_WAIT_MERCHANT',
    payStatus: 'paid',
    deliveryType: 'instant',
    reservedTime: null,
    goodsAmount: '5000',
    deliveryFee: '500',
    discountAmount: '0',
    payableAmount: '5500',
    paidAmount: '5500',
    addressSnapshot: {
      addressId: '1',
      consignee: 'Tom',
      mobile: '13800000000',
      province: '北京',
      city: '北京市',
      district: '海淀区',
      detail: 'xxx 路 1 号',
    },
    remark: '不要香菜',
    expireAt: String(now + 900_000),
    paidAt: String(now - 60_000),
    cancelledAt: null,
    cancelledBy: null,
    cancelledReason: null,
    completedAt: null,
    acceptedAt: null,
    expectedReadyAt: null,
    readyAt: null,
    rejectReason: null,
    createdAt: String(now - 60_000),
    updatedAt: String(now),
    ...overrides,
  } as FoodOrder;
}

function makeStore(): Store {
  return {
    storeId: '20001',
    merchantId: '30001',
  } as Store;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.foodOrderId === opt.where.foodOrderId) ?? null),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.orders.filter((o) => {
        if (where.storeId && o.storeId !== where.storeId) return false;
        if (where.status && o.status !== where.status) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
    save: jest.fn(async (o: FoodOrder) => {
      const idx = w.orders.findIndex((x) => x.foodOrderId === o.foodOrderId);
      if (idx >= 0) w.orders[idx] = o;
      return o;
    }),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.merchantId === opt.where.merchantId) ?? null),
  };
  const actionLogRepo: any = {
    insert: jest.fn(async (row: any) => {
      w.actionLogs.push({ ...row, merchantOrderActionLogId: String(w.actionLogs.length + 1) });
      return { identifiers: [{ merchantOrderActionLogId: String(w.actionLogs.length) }] };
    }),
  };
  const timelineRepo: any = {
    find: jest.fn(async () => []),
  };
  const orderItemRepo: any = {
    find: jest.fn(async () => []),
  };
  const locationRepo: any = {
    createQueryBuilder: jest.fn(() => ({
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
    })),
  };
  const eventBus = {
    publish: jest.fn((name: string, payload: unknown) => {
      w.events.push({ name, payload });
    }),
  } as unknown as DomainEventBus;

  const svc = new MerchantOrderService(
    orderRepo,
    orderItemRepo,
    storeRepo,
    locationRepo,
    actionLogRepo,
    timelineRepo,
    eventBus,
  );
  return { svc, orderRepo, storeRepo, actionLogRepo };
  /* eslint-enable */
}

describe('MerchantOrderService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      orders: [makeOrder()],
      stores: [makeStore()],
      actionLogs: [],
      events: [],
    };
  });

  describe('listPending', () => {
    it('返回 PAID_WAIT_MERCHANT 的订单', async () => {
      const { svc } = buildService(w);
      const r = await svc.listPending('30001', { pageNo: 1, pageSize: 20 });
      expect(r.total).toBe(1);
      expect(r.items[0]!.orderNo).toBe('F20260506000001');
      expect(r.items[0]!.acceptDeadline).toBeGreaterThan(r.items[0]!.createdAt);
    });

    it('商家无 store 时抛 FORBIDDEN', async () => {
      w.stores = [];
      const { svc } = buildService(w);
      await expect(svc.listPending('30001', {})).rejects.toThrow(ForbiddenException);
    });

    it('过滤其他状态(MERCHANT_ACCEPTED 不返回)', async () => {
      w.orders.push(makeOrder({ foodOrderId: '510002', orderNo: 'F2', status: 'PREPARING' }));
      const { svc } = buildService(w);
      const r = await svc.listPending('30001', {});
      expect(r.total).toBe(1);
    });
  });

  describe('accept', () => {
    it('PAID_WAIT_MERCHANT → PREPARING + emit MerchantOrderAccepted + 写 actionLog', async () => {
      const { svc } = buildService(w);
      const r = await svc.accept('30001', '510001', { expectedReadyMinutes: 20 });
      expect(r.status).toBe('PREPARING');
      expect(w.orders[0]!.status).toBe('PREPARING');
      expect(w.actionLogs[0]!.action).toBe('ACCEPT');
      expect(w.events[0]!.name).toBe('domain.merchant-order.accepted');
    });

    it('订单不存在抛 NotFound', async () => {
      const { svc } = buildService(w);
      await expect(svc.accept('30001', '999', {})).rejects.toThrow(NotFoundException);
    });

    it('订单非 PAID_WAIT_MERCHANT 抛 STATUS_INVALID', async () => {
      w.orders[0]!.status = 'PREPARING';
      const { svc } = buildService(w);
      await expect(svc.accept('30001', '510001', {})).rejects.toThrow(UnprocessableEntityException);
    });

    it('订单不归属商家抛 FORBIDDEN', async () => {
      w.stores[0]!.storeId = '99999';
      const { svc } = buildService(w);
      await expect(svc.accept('30001', '510001', {})).rejects.toThrow(ForbiddenException);
    });

    it('默认 expectedReadyMinutes=15', async () => {
      const { svc } = buildService(w);
      const r = await svc.accept('30001', '510001', {});
      expect(r.expectedReadyAt - r.acceptedAt).toBe(15 * 60 * 1000);
    });
  });

  describe('reject', () => {
    it('PAID_WAIT_MERCHANT → CANCELLED + 写流水 + emit MerchantOrderRejected', async () => {
      const { svc } = buildService(w);
      const r = await svc.reject('30001', '510001', { rejectReason: '商品已售罄' });
      expect(r.status).toBe('CANCELLED');
      expect(r.refundStatus).toBe('REFUNDING');
      expect(w.orders[0]!.cancelledBy).toBe('merchant');
      expect(w.actionLogs[0]!.action).toBe('REJECT');
      expect(w.events[0]!.name).toBe('domain.merchant-order.rejected');
    });

    it('rejectReason 空抛 INVALID_PARAM', async () => {
      const { svc } = buildService(w);
      await expect(svc.reject('30001', '510001', { rejectReason: '' })).rejects.toThrow(BadRequestException);
    });

    it('订单非 PAID_WAIT_MERCHANT 抛 STATUS_INVALID', async () => {
      w.orders[0]!.status = 'PREPARING';
      const { svc } = buildService(w);
      await expect(svc.reject('30001', '510001', { rejectReason: 'x' })).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('ready', () => {
    it('PREPARING → READY_FOR_PICKUP + emit FoodReadyForPickup', async () => {
      w.orders[0]!.status = 'PREPARING';
      const { svc } = buildService(w);
      const r = await svc.ready('30001', '510001', {});
      expect(r.status).toBe('READY_FOR_PICKUP');
      expect(w.events[0]!.name).toBe('domain.food-order.ready-for-pickup');
    });

    it('订单非 PREPARING 抛 STATUS_INVALID', async () => {
      const { svc } = buildService(w);
      await expect(svc.ready('30001', '510001', {})).rejects.toThrow(UnprocessableEntityException);
    });

    it('readyRemark 写入 payloadJson', async () => {
      w.orders[0]!.status = 'PREPARING';
      const { svc } = buildService(w);
      await svc.ready('30001', '510001', { readyRemark: '已打包' });
      expect(w.actionLogs[0]!.payloadJson).toEqual({ readyRemark: '已打包' });
    });
  });
});
