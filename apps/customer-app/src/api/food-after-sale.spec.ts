import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data },
  })),
}));

import { applyAfterSale } from './food-after-sale';

describe('food-after-sale api', () => {
  it('applyAfterSale POST /api/v1/c/after-sales', async () => {
    const r = await applyAfterSale({ orderId: 'o1', type: 'REFUND', reason: 'r', amountCents: 100 });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/after-sales');
    expect((r.data as { method: string }).method).toBe('POST');
    expect((r.data as { body: { amountCents: number } }).body.amountCents).toBe(100);
  });
});
