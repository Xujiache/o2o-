import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string }) => ({ code: '0', data: { url: opts.url } })),
}));

import { getOrderTrack } from './food-track';

describe('food-track api', () => {
  it('getOrderTrack GET /orders/:id/track', async () => {
    const r = await getOrderTrack('700001');
    expect((r.data as { url: string }).url).toBe('/api/v1/c/food/orders/700001/track');
  });
});
