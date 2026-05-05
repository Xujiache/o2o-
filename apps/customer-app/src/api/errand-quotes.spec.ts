import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import { quoteErrand } from './errand-quotes';

describe('errand-quotes api', () => {
  it('quoteErrand POST /quotes', async () => {
    const r = await quoteErrand({
      typeCode: 'BUY',
      deliveryAddress: { address: 'A' },
      urgentLevel: 'standard',
    });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/quotes');
    expect((r.data as { method: string }).method).toBe('POST');
  });
});
