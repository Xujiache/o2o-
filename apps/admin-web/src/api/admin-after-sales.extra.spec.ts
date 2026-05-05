import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { listAfterSales } from './admin-after-sales';

describe('admin-after-sales 边界用例', () => {
  it('无参数调用使用默认查询', async () => {
    const r = await listAfterSales();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/after-sales');
  });

  it('storeId 单独过滤', async () => {
    const r = await listAfterSales({ storeId: '20001' });
    expect((r.data as unknown as { params: { storeId: string } }).params.storeId).toBe('20001');
  });

  it('分页参数透传', async () => {
    const r = await listAfterSales({ pageNo: 2, pageSize: 50 });
    expect((r.data as unknown as { params: { pageNo: number; pageSize: number } }).params.pageNo).toBe(2);
    expect((r.data as unknown as { params: { pageNo: number; pageSize: number } }).params.pageSize).toBe(50);
  });
});
