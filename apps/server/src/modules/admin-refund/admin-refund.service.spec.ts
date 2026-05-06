import type { RefundOrder } from '../../database/entities';

import { AdminRefundService } from './admin-refund.service';

interface World {
  rows: RefundOrder[];
  events: Array<{ name: string; payload: unknown }>;
}

function buildService(w: World) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const repo: any = {
    create: jest.fn((p: any) => ({ ...p }) as RefundOrder),
    save: jest.fn(async (r: RefundOrder) => {
      if (!r.refundOrderId) {
        const item = { ...r, refundOrderId: String(w.rows.length + 1) } as RefundOrder;
        w.rows.push(item);
        return item;
      }
      const idx = w.rows.findIndex((x) => x.refundOrderId === r.refundOrderId);
      if (idx >= 0) w.rows[idx] = r;
      return r;
    }),
    findAndCount: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      const matched = w.rows.filter((r) => {
        if (where.status && r.status !== where.status) return false;
        if (where.bizType && r.bizType !== where.bizType) return false;
        if (where.bizOrderId && r.bizOrderId !== where.bizOrderId) return false;
        return true;
      });
      const skip = opt.skip ?? 0;
      const take = opt.take ?? matched.length;
      return [matched.slice(skip, skip + take), matched.length];
    }),
    findOne: jest.fn(async (opt: any) => {
      const where = opt.where ?? {};
      return (
        w.rows.find((r) => {
          if (where.refundOrderId && r.refundOrderId !== where.refundOrderId) return false;
          if (where.refundNo && r.refundNo !== where.refundNo) return false;
          return true;
        }) ?? null
      );
    }),
  };
  const eventBus: any = {
    publish: jest.fn(async (name: string, payload: unknown) => {
      w.events.push({ name, payload });
      return { eventId: `${name}-1` };
    }),
  };
  return { svc: new AdminRefundService(repo, eventBus) };
  /* eslint-enable */
}

describe('AdminRefundService', () => {
  it('createFromArbitration: 写 refund_order PENDING → mock SUCCESS + emit RefundExecuted', async () => {
    const w: World = { rows: [], events: [] };
    const { svc } = buildService(w);
    const r = await svc.createFromArbitration({
      bizType: 'FOOD',
      bizOrderId: '510001',
      paymentOrderId: 'P1',
      amount: '1000',
    });
    expect(r.status).toBe('SUCCESS');
    expect(r.refundNo).toMatch(/^RF\d{14}$/);
    expect(r.providerRefundId).toMatch(/^mock_/);
    expect(w.events).toHaveLength(1);
    expect(w.events[0]?.name).toBe('domain.refund.executed');
  });

  it('list: 多过滤维度', async () => {
    const w: World = {
      rows: [
        {
          refundOrderId: '1',
          refundNo: 'RF1',
          bizType: 'FOOD',
          bizOrderId: '510001',
          paymentOrderId: 'P1',
          amount: '1000',
          status: 'SUCCESS',
          provider: 'wxpay',
          providerRefundId: 'm_1',
          errorMessage: null,
          createdAt: '1',
          updatedAt: '1',
        } as unknown as RefundOrder,
        {
          refundOrderId: '2',
          refundNo: 'RF2',
          bizType: 'ERRAND',
          bizOrderId: '610001',
          paymentOrderId: 'P2',
          amount: '500',
          status: 'PENDING',
          provider: 'wxpay',
          providerRefundId: null,
          errorMessage: null,
          createdAt: '1',
          updatedAt: '1',
        } as unknown as RefundOrder,
      ],
      events: [],
    };
    const { svc } = buildService(w);
    const r1 = await svc.list({ bizType: 'FOOD' });
    expect(r1.total).toBe(1);
    const r2 = await svc.list({ status: 'PENDING' });
    expect(r2.total).toBe(1);
    const r3 = await svc.list({});
    expect(r3.total).toBe(2);
  });

  it('handleProviderCallback: 找到 PENDING → SUCCESS,重复返 duplicate', async () => {
    const w: World = {
      rows: [
        {
          refundOrderId: '1',
          refundNo: 'RF20260506000001',
          bizType: 'FOOD',
          bizOrderId: '510001',
          paymentOrderId: 'P1',
          amount: '1000',
          status: 'PENDING',
          provider: 'wxpay',
          providerRefundId: null,
          errorMessage: null,
          createdAt: '1',
          updatedAt: '1',
        } as unknown as RefundOrder,
      ],
      events: [],
    };
    const { svc } = buildService(w);
    const r1 = await svc.handleProviderCallback('wxpay', 'wx_x_1', 'RF20260506000001', true);
    expect(r1).toEqual({ ok: true });
    expect(w.rows[0]?.status).toBe('SUCCESS');
    const r2 = await svc.handleProviderCallback('wxpay', 'wx_x_1', 'RF20260506000001', true);
    expect(r2.duplicate).toBe(true);
  });

  it('detail: 找到返 vo,找不到 throw NotFoundException', async () => {
    const w: World = {
      rows: [
        {
          refundOrderId: '1',
          refundNo: 'RF1',
          bizType: 'FOOD',
          bizOrderId: '510001',
          paymentOrderId: null,
          amount: '1000',
          status: 'SUCCESS',
          provider: 'wxpay',
          providerRefundId: null,
          errorMessage: null,
          createdAt: '1',
          updatedAt: '1',
        } as unknown as RefundOrder,
      ],
      events: [],
    };
    const { svc } = buildService(w);
    const v = await svc.detail('1');
    expect(v.refundNo).toBe('RF1');
    await expect(svc.detail('999')).rejects.toThrow();
  });
});
