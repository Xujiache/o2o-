import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getAssessment } from './rider-assessment';

describe('rider-assessment api', () => {
  it('GET /r/assessment 默认无 period', async () => {
    const r = await getAssessment();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/assessment');
  });

  it('GET /r/assessment 指定 period', async () => {
    const r = await getAssessment(202605);
    expect((r.data as unknown as { params: { period: number } }).params.period).toBe(202605);
  });
});
