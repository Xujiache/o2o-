import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method, body: opts.data },
  })),
}));

import { replyReview } from './reviews';

describe('reviews api', () => {
  it('replyReview POST /m/reviews/{id}/reply', async () => {
    const r = await replyReview('800001', '感谢支持');
    expect((r.data as { url: string }).url).toBe('/api/v1/m/reviews/800001/reply');
    expect((r.data as { method: string }).method).toBe('POST');
    expect((r.data as { body: { content: string } }).body.content).toBe('感谢支持');
  });
});
