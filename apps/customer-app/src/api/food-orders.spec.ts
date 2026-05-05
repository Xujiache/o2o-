import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import { cancelOrder, getOrderDetail, listOrders, previewOrder, submitOrder, submitReview } from './food-orders';

describe('food-orders api', () => {
  it('previewOrder POST /preview', async () => {
    const r = await previewOrder({
      storeId: '20001',
      items: [{ skuId: '1', quantity: 1 }],
      addressId: '60001',
      deliveryType: 'instant',
    });
    expect((r.data as { url: string; method: string }).url).toBe('/api/v1/c/food/orders/preview');
  });

  it('submitOrder POST /orders', async () => {
    const r = await submitOrder({ previewId: 'p1', payChannel: 'wxpay' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders');
  });

  it('listOrders GET /orders', async () => {
    const r = await listOrders({});
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders');
  });

  it('getOrderDetail GET /orders/:id', async () => {
    const r = await getOrderDetail('700001');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders/700001');
  });

  it('cancelOrder POST /orders/:id/cancel', async () => {
    const r = await cancelOrder('700001', 'reason');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders/700001/cancel');
  });

  it('submitReview POST /orders/:id/reviews', async () => {
    const r = await submitReview('700001', { rating: 5 });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders/700001/reviews');
  });
});
