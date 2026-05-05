import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { listWithdrawals } from './admin-withdrawals';

describe('admin-withdrawals 边界用例', () => {
  it('无参数', async () => {
    const r = await listWithdrawals();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/withdrawals');
  });

  it('storeId 过滤', async () => {
    const r = await listWithdrawals({ storeId: '20001' });
    expect((r.data as unknown as { params: { storeId: string } }).params.storeId).toBe('20001');
  });

  it('FAILED 状态过滤', async () => {
    const r = await listWithdrawals({ status: 'FAILED' });
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('FAILED');
  });
});
