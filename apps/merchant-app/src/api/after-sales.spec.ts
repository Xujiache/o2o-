import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data, params: opts.params },
  })),
}));

import { listAfterSales, reviewAfterSale } from './after-sales';

describe('after-sales api', () => {
  it('listAfterSales GET /m/after-sales', async () => {
    const r = await listAfterSales({ status: 'PENDING_MERCHANT' });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/after-sales');
    expect((r.data as { params: { status: string } }).params.status).toBe('PENDING_MERCHANT');
  });

  it('reviewAfterSale POST /m/after-sales/{id}/review APPROVE', async () => {
    const r = await reviewAfterSale('700001', { reviewResult: 'APPROVE' });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/after-sales/700001/review');
    expect((r.data as { body: { reviewResult: string } }).body.reviewResult).toBe('APPROVE');
  });

  it('reviewAfterSale POST REJECT 带 rejectReason', async () => {
    const r = await reviewAfterSale('700001', { reviewResult: 'REJECT', rejectReason: 'no proof' });
    expect((r.data as { body: { rejectReason: string } }).body.rejectReason).toBe('no proof');
  });
});
