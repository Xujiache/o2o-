import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import type { FoodOrder, OrderTimeline, PaymentOrder } from '../../database/entities';

import { AdminFoodOrderService } from './admin-food-order.service';

describe('AdminFoodOrderService', () => {
  let svc: AdminFoodOrderService;
  let orders: FoodOrder[];
  let timelines: OrderTimeline[];
  let payments: PaymentOrder[];

  beforeEach(() => {
    const now = Date.now();
    orders = [
      {
        foodOrderId: '700001',
        orderNo: '20260506000001',
        customerId: '10001',
        storeId: '20001',
        cityCode: 'BJ',
        status: 'WAIT_PAY',
        payStatus: 'unpaid',
        goodsAmount: '5600',
        deliveryFee: '300',
        payableAmount: '5900',
        expireAt: String(now - 5 * 60 * 1000),
        paidAt: null,
        cancelledAt: null,
        createdAt: String(now - 1000),
        updatedAt: String(now - 1000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700002',
        orderNo: '20260506000002',
        customerId: '10002',
        storeId: '20002',
        cityCode: 'SH',
        status: 'PAID_WAIT_MERCHANT',
        payStatus: 'paid',
        goodsAmount: '3000',
        deliveryFee: '0',
        payableAmount: '3000',
        expireAt: String(now + 1000),
        paidAt: String(now - 15 * 60 * 1000), // 商家 10 min 未接
        cancelledAt: null,
        createdAt: String(now - 2000),
        updatedAt: String(now - 2000),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700003',
        orderNo: '20260506000003',
        customerId: '10003',
        storeId: '20001',
        cityCode: 'BJ',
        status: 'DELIVERING',
        payStatus: 'paid',
        goodsAmount: '2000',
        deliveryFee: '300',
        payableAmount: '2300',
        expireAt: '0',
        paidAt: String(now),
        cancelledAt: null,
        createdAt: String(now - 3000),
        updatedAt: String(now),
      } as unknown as FoodOrder,
      {
        foodOrderId: '700004',
        orderNo: '20260506000004',
        customerId: '10004',
        storeId: '20001',
        cityCode: 'BJ',
        status: 'COMPLETED',
        payStatus: 'paid',
        goodsAmount: '1000',
        deliveryFee: '0',
        payableAmount: '1000',
        expireAt: '0',
        paidAt: String(now - 24 * 60 * 60 * 1000),
        cancelledAt: null,
        createdAt: String(now - 24 * 60 * 60 * 1000),
        updatedAt: String(now), // 今日完成
      } as unknown as FoodOrder,
    ];
    timelines = [
      {
        orderTimelineId: '1',
        orderId: '700001',
        bizType: 'FOOD',
        fromStatus: null,
        toStatus: 'WAIT_PAY',
        actorType: 'customer',
        actorId: '10001',
        reason: 'submitted',
        createdAt: String(now - 1000),
      } as unknown as OrderTimeline,
    ];
    payments = [
      {
        paymentOrderId: '800001',
        payOrderNo: 'P20260506100000000001',
        bizType: 'FOOD',
        bizId: '700002',
        payChannel: 'wxpay',
        payableAmount: '3000',
        status: 'success',
        channelTradeNo: 'wx_real',
        paidAt: String(now - 15 * 60 * 1000),
      } as unknown as PaymentOrder,
    ];

    const orderRepo = {
      findOne: jest.fn(({ where }: { where: Partial<FoodOrder> }) =>
        Promise.resolve(orders.find((o) => o.foodOrderId === where.foodOrderId) ?? null),
      ),
      createQueryBuilder: jest.fn(() => {
        const filters: { st?: string; cc?: string; cid?: string; sid?: string; pc?: string; full?: string } = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qb: any = {};
        let lastSql = '';
        qb.where = jest.fn().mockImplementation((sql: string, params?: Record<string, unknown>) => {
          lastSql = sql;
          if (params) Object.assign(filters, params);
          if (sql.includes('expire_at')) filters.full = 'waitPayOverdue';
          if (sql.includes('paid_at')) filters.full = 'merchantOverdue';
          if (sql.includes("'PICKED_UP', 'DELIVERING'")) filters.full = 'delivering';
          if (sql.includes('updated_at')) filters.full = 'completedToday';
          if (sql.includes('cancelled_at')) filters.full = 'cancelledToday';
          return qb;
        });
        qb.andWhere = jest.fn().mockImplementation((sql: string, params?: Record<string, unknown>) => {
          if (params) Object.assign(filters, params);
          lastSql = sql;
          return qb;
        });
        qb.orderBy = jest.fn().mockImplementation(() => qb);
        let _skip = 0;
        let _take = 20;
        qb.skip = jest.fn().mockImplementation((n: number) => {
          _skip = n;
          return qb;
        });
        qb.take = jest.fn().mockImplementation((n: number) => {
          _take = n;
          return qb;
        });
        const filtered = (): FoodOrder[] => {
          let arr = [...orders];
          if (filters.full === 'waitPayOverdue')
            return arr.filter((o) => o.status === 'WAIT_PAY' && Number(o.expireAt) < Date.now());
          if (filters.full === 'merchantOverdue')
            return arr.filter(
              (o) => o.status === 'PAID_WAIT_MERCHANT' && o.paidAt && Number(o.paidAt) < Date.now() - 10 * 60 * 1000,
            );
          if (filters.full === 'delivering')
            return arr.filter((o) => o.status === 'PICKED_UP' || o.status === 'DELIVERING');
          if (filters.full === 'completedToday')
            return arr.filter(
              (o) => o.status === 'COMPLETED' && Number(o.updatedAt) >= new Date().setHours(0, 0, 0, 0),
            );
          if (filters.full === 'cancelledToday') return [];
          if (filters.st) arr = arr.filter((o) => o.status === filters.st);
          if (filters.cc) arr = arr.filter((o) => o.cityCode === filters.cc);
          if (filters.cid) arr = arr.filter((o) => o.customerId === filters.cid);
          if (filters.sid) arr = arr.filter((o) => o.storeId === filters.sid);
          return arr.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
        };
        qb.getCount = jest.fn().mockImplementation(async () => filtered().length);
        qb.getMany = jest.fn().mockImplementation(async () => filtered().slice(_skip, _skip + _take));
        void lastSql;
        return qb;
      }),
    } as unknown as jest.Mocked<Repository<FoodOrder>>;

    const timelineRepo = {
      find: jest.fn(({ where }: { where: Partial<OrderTimeline> }) =>
        Promise.resolve(timelines.filter((t) => t.orderId === where.orderId)),
      ),
    } as unknown as jest.Mocked<Repository<OrderTimeline>>;

    const paymentRepo = {
      findOne: jest.fn(({ where }: { where: Partial<PaymentOrder> }) =>
        Promise.resolve(payments.find((p) => p.bizType === where.bizType && p.bizId === where.bizId) ?? null),
      ),
    } as unknown as jest.Mocked<Repository<PaymentOrder>>;

    svc = new AdminFoodOrderService(orderRepo, timelineRepo, paymentRepo);
  });

  it('list 默认返全部 4 条', async () => {
    const r = await svc.list({});
    expect(r.total).toBe(4);
  });

  it('list status=WAIT_PAY 筛选', async () => {
    const r = await svc.list({ status: 'WAIT_PAY' });
    expect(r.total).toBe(1);
  });

  it('list cityCode=BJ 筛选', async () => {
    const r = await svc.list({ cityCode: 'BJ' });
    expect(r.total).toBe(3);
  });

  it('list customerId 筛选', async () => {
    const r = await svc.list({ customerId: '10002' });
    expect(r.total).toBe(1);
    expect(r.list[0]!.orderId).toBe('700002');
  });

  it('detail 含 timeline + payment', async () => {
    const r = await svc.detail('700002');
    expect(r.payment?.payChannel).toBe('wxpay');
  });

  it('detail 不存在 → DATA_NOT_FOUND', async () => {
    await expect(svc.detail('999999')).rejects.toThrow(NotFoundException);
  });

  it('timelineStatistics 5 字段', async () => {
    const r = await svc.timelineStatistics();
    expect(r.waitPayOverdueCount).toBe(1);
    expect(r.merchantAcceptOverdueCount).toBe(1);
    expect(r.deliveringCount).toBe(1);
    expect(r.completedTodayCount).toBe(1);
    expect(r.cancelledTodayCount).toBe(0);
  });

  it('list 分页 pageSize=2', async () => {
    const r = await svc.list({ pageSize: 2 });
    expect(r.list).toHaveLength(2);
    expect(r.total).toBe(4);
  });
});
