import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method: string }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method },
  })),
}));

import { claimCoupon, listAvailableCoupons, listMyCoupons } from './coupons';

type MockData = { url: string; method: string };

describe('coupons api', () => {
  it('listAvailableCoupons → GET /c/coupons/available', async () => {
    const r = await listAvailableCoupons();
    const d = r.data as unknown as MockData;
    expect(d.url).toBe('/api/v1/c/coupons/available');
    expect(d.method).toBe('GET');
  });

  it('claimCoupon → POST /c/coupons/claim/:id', async () => {
    const r = await claimCoupon('901');
    const d = r.data as unknown as MockData;
    expect(d.url).toBe('/api/v1/c/coupons/claim/901');
    expect(d.method).toBe('POST');
  });

  it('listMyCoupons → GET /c/coupons/my', async () => {
    const r = await listMyCoupons({ status: 'UNUSED' });
    const d = r.data as unknown as MockData;
    expect(d.url).toBe('/api/v1/c/coupons/my');
    expect(d.method).toBe('GET');
  });
});
