import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import { listErrandTypes } from './errand-types';

describe('errand-types api', () => {
  it('listErrandTypes GET /service-types', async () => {
    const r = await listErrandTypes('GLOBAL');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/errand/service-types');
  });
});
