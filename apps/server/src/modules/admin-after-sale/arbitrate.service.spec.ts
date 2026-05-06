import type { AfterSale, AfterSaleArbitration } from '../../database/entities';

import { ArbitrateService } from './arbitrate.service';

interface World {
  afterSales: AfterSale[];
  arbitrations: AfterSaleArbitration[];
  events: Array<{ name: string }>;
  refundCalls: number;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const afterSaleRepo: any = {
    findOne: jest.fn(async (opt: any) => w.afterSales.find((a) => a.afterSaleId === opt.where.afterSaleId) ?? null),
    save: jest.fn(async (a: AfterSale) => {
      const idx = w.afterSales.findIndex((x) => x.afterSaleId === a.afterSaleId);
      if (idx >= 0) w.afterSales[idx] = a;
      return a;
    }),
  };
  const arbitrationRepo: any = {
    create: jest.fn((p: any) => ({ ...p }) as AfterSaleArbitration),
    save: jest.fn(async (a: AfterSaleArbitration) => {
      const item = { ...a, arbitrationId: String(w.arbitrations.length + 1) } as AfterSaleArbitration;
      w.arbitrations.push(item);
      return item;
    }),
  };
  const refundService: any = {
    createFromArbitration: jest.fn(async () => {
      w.refundCalls++;
      return { refundOrderId: 'RF1' };
    }),
  };
  const eventBus: any = {
    publish: jest.fn(async (name: string) => {
      w.events.push({ name });
      return { eventId: 'e1' };
    }),
  };
  return { svc: new ArbitrateService(afterSaleRepo, arbitrationRepo, refundService, eventBus) };
  /* eslint-enable */
}

describe('ArbitrateService', () => {
  it('arbitrate APPROVE: 创退款 + 状态 REFUNDED + emit', async () => {
    const w: World = {
      afterSales: [{ afterSaleId: 'AS1', orderId: '510001', status: 'PENDING_PLATFORM' } as unknown as AfterSale],
      arbitrations: [],
      events: [],
      refundCalls: 0,
    };
    const { svc } = buildService(w);
    const r = await svc.arbitrate(
      'AS1',
      { responsibleParty: 'MERCHANT', decision: 'APPROVE', refundAmount: '1000', penalty: '0' },
      '1',
    );
    expect(r.status).toBe('REFUNDED');
    expect(r.refundOrderId).toBe('RF1');
    expect(w.refundCalls).toBe(1);
    expect(w.events[0]?.name).toBe('domain.after-sale.arbitration-completed');
  });

  it('arbitrate REJECT: 不创退款 + 状态 COMPLETED', async () => {
    const w: World = {
      afterSales: [{ afterSaleId: 'AS2', orderId: '510002', status: 'PENDING_PLATFORM' } as unknown as AfterSale],
      arbitrations: [],
      events: [],
      refundCalls: 0,
    };
    const { svc } = buildService(w);
    const r = await svc.arbitrate(
      'AS2',
      { responsibleParty: 'CUSTOMER', decision: 'REJECT', refundAmount: '0', penalty: '0' },
      '1',
    );
    expect(r.status).toBe('COMPLETED');
    expect(r.refundOrderId).toBeNull();
    expect(w.refundCalls).toBe(0);
  });

  it('arbitrate: 状态非 PENDING_PLATFORM → BadRequest', async () => {
    const w: World = {
      afterSales: [{ afterSaleId: 'AS3', orderId: '510003', status: 'COMPLETED' } as unknown as AfterSale],
      arbitrations: [],
      events: [],
      refundCalls: 0,
    };
    const { svc } = buildService(w);
    await expect(
      svc.arbitrate(
        'AS3',
        { responsibleParty: 'MERCHANT', decision: 'APPROVE', refundAmount: '1000', penalty: '0' },
        '1',
      ),
    ).rejects.toThrow();
  });

  it('arbitrate: 找不到 → NotFound', async () => {
    const w: World = { afterSales: [], arbitrations: [], events: [], refundCalls: 0 };
    const { svc } = buildService(w);
    await expect(
      svc.arbitrate(
        'AS999',
        { responsibleParty: 'MERCHANT', decision: 'APPROVE', refundAmount: '1', penalty: '0' },
        '1',
      ),
    ).rejects.toThrow();
  });
});
