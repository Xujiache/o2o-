import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method, params: opts.params },
  })),
}));

import { listSettlements } from './settlements';

describe('settlements api', () => {
  it('listSettlements GET /m/settlements', async () => {
    const r = await listSettlements({ month: '202605' });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/settlements');
    expect((r.data as { params: { month: string } }).params.month).toBe('202605');
  });

  it('listSettlements 无参数', async () => {
    const r = await listSettlements();
    expect((r.data as { url: string }).url).toBe('/api/v1/m/settlements');
  });
});
