import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/request', () => ({
  request: vi.fn(async (opts: { url: string; method?: string; params?: unknown }) => ({
    code: '0',
    data: { url: opts.url, method: opts.method ?? 'GET', params: opts.params },
  })),
}));

import { getDispatchDetail, listDispatchTasks } from './admin-dispatch';

describe('admin-dispatch api', () => {
  it('list', async () => {
    const r = await listDispatchTasks({ status: 'PENDING' });
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/dispatch-tasks');
    expect((r.data as unknown as { params: { status: string } }).params.status).toBe('PENDING');
  });

  it('detail', async () => {
    const r = await getDispatchDetail('D1');
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/dispatch-tasks/D1');
  });

  it('list 无参数', async () => {
    const r = await listDispatchTasks();
    expect((r.data as unknown as { url: string }).url).toBe('/api/v1/admin/dispatch-tasks');
  });
});
