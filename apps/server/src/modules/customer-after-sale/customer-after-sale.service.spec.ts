import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { AfterSale, AfterSaleEvidence, FoodOrder, Store, SysConfig } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';

import { CustomerAfterSaleService } from './customer-after-sale.service';

interface World {
  afterSales: AfterSale[];
  evidences: AfterSaleEvidence[];
  orders: FoodOrder[];
  stores: Store[];
  configs: SysConfig[];
  events: { name: string; payload: unknown }[];
}

function makeOrder(overrides: Partial<FoodOrder> = {}): FoodOrder {
  const now = Date.now();
  return {
    foodOrderId: '510001',
    customerId: '10001',
    storeId: '20001',
    status: 'COMPLETED',
    payableAmount: '5500',
    completedAt: String(now - 60_000),
    updatedAt: String(now),
    createdAt: String(now - 3600_000),
    ...overrides,
  } as FoodOrder;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const afterSaleRepo: any = {
    findOne: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return w.afterSales.find((a) => {
        if (where.orderId && a.orderId !== where.orderId) return false;
        if (where.status && a.status !== where.status) return false;
        return true;
      });
    }),
    create: jest.fn((row: any) => row),
    save: jest.fn(async (row: any) => {
      const inserted = { ...row, afterSaleId: String(700000 + w.afterSales.length + 1) };
      w.afterSales.push(inserted);
      return inserted;
    }),
  };
  const evidenceRepo: any = {
    insert: jest.fn(async (row: any) => {
      w.evidences.push({ ...row, afterSaleEvidenceId: String(w.evidences.length + 1) });
    }),
  };
  const orderRepo: any = {
    findOne: jest.fn(async (opt: any) => w.orders.find((o) => o.foodOrderId === opt.where.foodOrderId) ?? null),
  };
  const storeRepo: any = {
    findOne: jest.fn(async (opt: any) => w.stores.find((s) => s.storeId === opt.where.storeId) ?? null),
  };
  const sysConfigRepo: any = {
    findOne: jest.fn(async (opt: any) => w.configs.find((c) => c.configKey === opt.where.configKey) ?? null),
  };
  const eventBus = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: 'e1' };
    }),
  } as unknown as DomainEventBus;

  const svc = new CustomerAfterSaleService(afterSaleRepo, evidenceRepo, orderRepo, storeRepo, sysConfigRepo, eventBus);
  return { svc };
  /* eslint-enable */
}

describe('CustomerAfterSaleService', () => {
  let w: World;
  beforeEach(() => {
    w = {
      afterSales: [],
      evidences: [],
      orders: [makeOrder()],
      stores: [{ storeId: '20001', merchantId: '30001' } as Store],
      configs: [],
      events: [],
    };
  });

  it('COMPLETED 订单可申请售后,emit AfterSaleApplied + 写凭证', async () => {
    const { svc } = buildService(w);
    const r = await svc.apply('10001', {
      orderId: '510001',
      type: 'REFUND',
      reason: '送错餐',
      amountCents: 5000,
      evidenceFileIds: ['9001', '9002'],
    });
    expect(r.status).toBe('PENDING_MERCHANT');
    expect(w.afterSales.length).toBe(1);
    expect(w.evidences.length).toBe(2);
    expect(w.events[0]!.name).toBe('domain.after-sale.applied');
  });

  it('订单不存在抛 NotFound', async () => {
    const { svc } = buildService(w);
    await expect(svc.apply('10001', { orderId: '999', type: 'REFUND', reason: 'r', amountCents: 100 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('订单不归属用户抛 FORBIDDEN', async () => {
    const { svc } = buildService(w);
    await expect(
      svc.apply('99999', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 100 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('WAIT_PAY 订单抛 STATUS_INVALID', async () => {
    w.orders[0]!.status = 'WAIT_PAY';
    const { svc } = buildService(w);
    await expect(
      svc.apply('10001', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 100 }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('amount 超过 payable 抛 INVALID_PARAM', async () => {
    const { svc } = buildService(w);
    await expect(
      svc.apply('10001', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 999999 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('已存在 PENDING 售后单抛 DUPLICATE_REQUEST', async () => {
    w.afterSales.push({ orderId: '510001', status: 'PENDING_MERCHANT' } as AfterSale);
    const { svc } = buildService(w);
    await expect(
      svc.apply('10001', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 100 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('超过 7 天窗口抛 INVALID_PARAM', async () => {
    w.orders[0]!.completedAt = String(Date.now() - 8 * 24 * 3600 * 1000);
    const { svc } = buildService(w);
    await expect(
      svc.apply('10001', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 100 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('after_sale.window_days sysconfig 生效', async () => {
    w.configs.push({ configKey: 'after_sale.window_days', configValue: '14' } as SysConfig);
    w.orders[0]!.completedAt = String(Date.now() - 10 * 24 * 3600 * 1000);
    const { svc } = buildService(w);
    const r = await svc.apply('10001', { orderId: '510001', type: 'REFUND', reason: 'r', amountCents: 100 });
    expect(r.status).toBe('PENDING_MERCHANT');
  });
});
