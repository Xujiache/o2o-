import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getTrackReplay } from './admin-track-replay';

describe('admin-track-replay api', () => {
  it('GET /admin/track-replay 按 riderTaskId', async () => {
    const r = await getTrackReplay({ riderTaskId: 'RT1' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/track-replay');
    expect((r.data as unknown as { params: { riderTaskId: string } }).params.riderTaskId).toBe('RT1');
  });

  it('GET /admin/track-replay 按 riderId+from', async () => {
    const r = await getTrackReplay({ riderId: '30001', from: 1000 });
    expect((r.data as unknown as { params: { riderId: string; from: number } }).params.riderId).toBe('30001');
  });
});
