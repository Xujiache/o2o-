import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string }) => ({ code: '0', data: { url: opts.url } })),
}));

import { getFoodHome } from './food-home';

describe('food-home api', () => {
  it('getFoodHome 路径与参数', async () => {
    const r = await getFoodHome('BJ', 116.4, 39.9);
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/home');
  });
});
