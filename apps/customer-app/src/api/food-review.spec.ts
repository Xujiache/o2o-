import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data },
  })),
}));

import { submitReview } from './food-review';

describe('food-review api', () => {
  it('submitReview POST /api/v1/c/reviews', async () => {
    const r = await submitReview({ orderId: 'o1', rating: 5, content: 'good' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/reviews');
    expect((r.data as { method: string }).method).toBe('POST');
    expect((r.data as { body: { rating: number } }).body.rating).toBe(5);
  });
});
