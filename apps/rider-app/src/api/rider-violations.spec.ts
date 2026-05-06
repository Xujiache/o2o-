import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { listViolations } from './rider-violations';

describe('rider-violations api', () => {
  it('GET /r/violations', async () => {
    const r = await listViolations({ status: 'CONFIRMED' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/violations');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('CONFIRMED');
  });
});
