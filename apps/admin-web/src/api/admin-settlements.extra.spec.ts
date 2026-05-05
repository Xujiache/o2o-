import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { listSettlements } from './admin-settlements';

describe('admin-settlements 边界用例', () => {
  it('无参数', async () => {
    const r = await listSettlements();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/settlements');
  });

  it('storeId 过滤', async () => {
    const r = await listSettlements({ storeId: '20001' });
    expect((r.data as unknown as { params: { storeId: string } }).params.storeId).toBe('20001');
  });
});
