import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method, params: opts.params },
  })),
}));

import { getStatistics } from './statistics';

describe('statistics api', () => {
  it('getStatistics GET /m/statistics with range', async () => {
    const r = await getStatistics('WEEK');
    expect((r.data as { url: string }).url).toBe('/api/v1/m/statistics');
    expect((r.data as { params: { range: string } }).params.range).toBe('WEEK');
  });

  it('getStatistics 默认 TODAY', async () => {
    const r = await getStatistics();
    expect((r.data as { params: { range: string } }).params.range).toBe('TODAY');
  });
});
