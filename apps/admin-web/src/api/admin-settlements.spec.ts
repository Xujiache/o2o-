import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getSettlementDetail, listSettlements } from './admin-settlements';

describe('admin-settlements api', () => {
  it('listSettlements GET /admin/settlements', async () => {
    const r = await listSettlements({ status: 'PENDING' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/settlements');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('PENDING');
  });

  it('getSettlementDetail GET /admin/settlements/:id', async () => {
    const r = await getSettlementDetail('900001');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/settlements/900001');
  });
});
