import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getWithdrawalDetail, listWithdrawals } from './admin-withdrawals';

describe('admin-withdrawals api', () => {
  it('listWithdrawals GET /admin/withdrawals', async () => {
    const r = await listWithdrawals({ status: 'PENDING' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/withdrawals');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('PENDING');
  });

  it('getWithdrawalDetail GET /admin/withdrawals/:id', async () => {
    const r = await getWithdrawalDetail('A1');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/withdrawals/A1');
  });
});
