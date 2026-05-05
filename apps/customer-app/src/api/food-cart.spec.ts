import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET' },
  })),
}));

import { upsertCartItem } from './food-cart';

describe('food-cart api', () => {
  it('upsertCartItem POST /cart/items', async () => {
    const r = await upsertCartItem({ storeId: '20001', skuId: '9011', quantity: 2 });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/cart/items');
  });
});
