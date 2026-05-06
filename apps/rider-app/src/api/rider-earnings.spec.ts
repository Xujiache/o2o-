import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getEarnings } from './rider-earnings';

describe('rider-earnings api', () => {
  it('GET /r/earnings 默认', async () => {
    const r = await getEarnings();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/earnings');
  });

  it('GET /r/earnings 带 fromDate/toDate', async () => {
    const r = await getEarnings({ fromDate: 20260501, toDate: 20260531 });
    expect((r.data as unknown as { params: { fromDate: number } }).params.fromDate).toBe(20260501);
  });
});
