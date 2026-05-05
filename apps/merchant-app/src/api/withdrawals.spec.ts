import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; data?: unknown; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method, body: opts.data, params: opts.params },
  })),
}));

import { createWithdrawal, listWithdrawals } from './withdrawals';

describe('withdrawals api', () => {
  it('listWithdrawals GET /m/withdrawals', async () => {
    const r = await listWithdrawals({ status: 'PENDING' });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/withdrawals');
    expect((r.data as { params: { status: string } }).params.status).toBe('PENDING');
  });

  it('createWithdrawal POST /m/withdrawals', async () => {
    const r = await createWithdrawal({ amountCents: 100000, smsCode: '123456' });
    expect((r.data as { url: string }).url).toBe('/api/v1/m/withdrawals');
    expect((r.data as { method: string }).method).toBe('POST');
    expect((r.data as { body: { amountCents: number } }).body.amountCents).toBe(100000);
  });
});
