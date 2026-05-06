import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', body: opts.data, params: opts.params },
  })),
}));

import { createWithdrawal, listWithdrawals } from './rider-withdrawals';

describe('rider-withdrawals api', () => {
  it('GET /r/withdrawals', async () => {
    const r = await listWithdrawals({ status: 'PENDING' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/r/withdrawals');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('PENDING');
  });

  it('POST /r/withdrawals', async () => {
    const r = await createWithdrawal({ amountCents: 50000, mobile: '13800000001', smsCode: '123456' });
    expect((r.data as unknown as { method: string }).method).toBe('POST');
    expect((r.data as unknown as { body: { amountCents: number } }).body.amountCents).toBe(50000);
  });
});
