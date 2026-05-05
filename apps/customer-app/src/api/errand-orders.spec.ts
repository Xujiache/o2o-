import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import {
  cancelErrandOrder,
  getErrandOrderDetail,
  listErrandOrders,
  remarkErrandOrder,
  submitErrand,
  urgentErrandOrder,
} from './errand-orders';

describe('errand-orders api', () => {
  it('submitErrand POST /orders', async () => {
    const r = await submitErrand({ quoteId: 'q1', payChannel: 'wxpay' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders');
    expect((r.data as { method: string }).method).toBe('POST');
  });

  it('listErrandOrders GET /orders', async () => {
    const r = await listErrandOrders('IN_PROGRESS');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders');
  });

  it('getErrandOrderDetail GET /orders/{id}', async () => {
    const r = await getErrandOrderDetail('600001');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders/600001');
  });

  it('cancelErrandOrder POST /orders/{id}/cancel', async () => {
    const r = await cancelErrandOrder('600001', 'reason');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders/600001/cancel');
  });

  it('urgentErrandOrder POST /orders/{id}/urgent', async () => {
    const r = await urgentErrandOrder('600001', { urgentLevel: 'fast', confirmFee: 500 });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders/600001/urgent');
  });

  it('remarkErrandOrder PATCH /orders/{id}/remark', async () => {
    const r = await remarkErrandOrder('600001', { remark: 'r' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders/600001/remark');
    expect((r.data as { method: string }).method).toBe('PATCH');
  });
});
