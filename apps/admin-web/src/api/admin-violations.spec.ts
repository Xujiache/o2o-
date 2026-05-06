import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { listViolations } from './admin-violations';

describe('admin-violations api', () => {
  it('list 默认', async () => {
    const r = await listViolations();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/violations');
  });

  it('list status/type/riderId 过滤', async () => {
    const r = await listViolations({ status: 'CONFIRMED', type: 'LATE', riderId: '30001' });
    const params = (r.data as unknown as { params: { status: string; type: string; riderId: string } }).params;
    expect(params.status).toBe('CONFIRMED');
    expect(params.type).toBe('LATE');
    expect(params.riderId).toBe('30001');
  });
});
