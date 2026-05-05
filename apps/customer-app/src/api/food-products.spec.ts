import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string }) => ({ code: '0', data: { url: opts.url } })),
}));

import { getStoreProducts } from './food-products';

describe('food-products api', () => {
  it('getStoreProducts 路径', async () => {
    const r = await getStoreProducts('20001');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/stores/20001/products');
  });
});
