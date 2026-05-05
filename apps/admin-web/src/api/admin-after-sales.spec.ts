import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getAfterSaleDetail, listAfterSales } from './admin-after-sales';

describe('admin-after-sales api', () => {
  it('listAfterSales GET /admin/after-sales', async () => {
    const r = await listAfterSales({ status: 'PENDING_MERCHANT' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/after-sales');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('PENDING_MERCHANT');
  });

  it('getAfterSaleDetail GET /admin/after-sales/:id', async () => {
    const r = await getAfterSaleDetail('700001');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/after-sales/700001');
  });
});
