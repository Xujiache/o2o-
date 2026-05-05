import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string }) => ({ code: '0', data: { url: opts.url } })),
}));

import { prepay } from './food-payments';

describe('food-payments api', () => {
  it('prepay POST /c/payments/prepay', async () => {
    const r = await prepay({ bizType: 'FOOD', orderId: '700001', payChannel: 'wxpay' });
    expect((r.data as { url: string }).url).toBe('/api/v1/c/payments/prepay');
  });
});
