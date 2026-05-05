import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import {
  AdminErrandOrderEndpoints,
  getErrandOrderDetail,
  getErrandStats,
  listErrandOrders,
} from './admin-errand-orders';

describe('admin-errand-orders api', () => {
  it('AdminErrandOrderEndpoints 路径正确', () => {
    expect(AdminErrandOrderEndpoints.List).toBe('/api/v1/admin/errand-orders');
    expect(AdminErrandOrderEndpoints.Detail('600001')).toBe('/api/v1/admin/errand-orders/600001');
    expect(AdminErrandOrderEndpoints.Stats).toBe('/api/v1/admin/errand-orders/stats');
  });

  it('listErrandOrders 透传 query', async () => {
    const r = await listErrandOrders({ status: 'PAID', page: 1, pageSize: 10 });
    const data = r.data as unknown as { url: string; params: { status: string } };
    expect(data.url).toBe('/api/v1/admin/errand-orders');
    expect(data.params.status).toBe('PAID');
  });

  it('getErrandOrderDetail GET /errand-orders/:id', async () => {
    const r = await getErrandOrderDetail('600001');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/errand-orders/600001');
  });

  it('getErrandStats GET /stats', async () => {
    const r = await getErrandStats();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/errand-orders/stats');
  });
});
