import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import { getErrandTrack } from './errand-track';

describe('errand-track api', () => {
  it('getErrandTrack GET /track', async () => {
    const r = await getErrandTrack('600001');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/orders/600001/track');
  });
});
