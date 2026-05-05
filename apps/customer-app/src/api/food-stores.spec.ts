import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string }) => ({ code: '0', data: { url: opts.url } })),
}));

import { listFoodStores } from './food-stores';

describe('food-stores api', () => {
  it('listFoodStores 路径', async () => {
    const r = await listFoodStores({ cityCode: 'BJ' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/stores');
  });
});
