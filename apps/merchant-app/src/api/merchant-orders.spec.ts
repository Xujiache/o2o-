import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data, params: opts.params },
  })),
}));

import { acceptOrder, listPendingOrders, readyOrder, rejectOrder } from './merchant-orders';

describe('merchant-orders api', () => {
  it('listPendingOrders GET /m/food-orders/pending', async () => {
    const r = await listPendingOrders({ pageNo: 1, pageSize: 20 });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/food-orders/pending');
    expect((r.data as { method: string }).method).toBe('GET');
  });

  it('acceptOrder POST /m/food-orders/{id}/accept', async () => {
    const r = await acceptOrder('510001', 20);
    expect((r.data as { url: string }).url).toBe('/api/v1/m/food-orders/510001/accept');
    expect((r.data as { body: { expectedReadyMinutes: number } }).body.expectedReadyMinutes).toBe(20);
  });

  it('rejectOrder POST /m/food-orders/{id}/reject', async () => {
    const r = await rejectOrder('510001', 'no stock');
    expect((r.data as { url: string }).url).toBe('/api/v1/m/food-orders/510001/reject');
    expect((r.data as { body: { rejectReason: string } }).body.rejectReason).toBe('no stock');
  });

  it('readyOrder POST /m/food-orders/{id}/ready', async () => {
    const r = await readyOrder('510001', 'packed');
    expect((r.data as { url: string }).url).toBe('/api/v1/m/food-orders/510001/ready');
    expect((r.data as { body: { readyRemark: string } }).body.readyRemark).toBe('packed');
  });
});
