import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const overviewMock = vi.fn();
vi.mock('@/api/admin-dashboard', () => ({ getDashboardOverview: (...a: unknown[]) => overviewMock(...a) }));

import Dashboard from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('dashboard/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    overviewMock.mockReset();
  });
  it('挂载即拉 overview + 渲染 GMV', async () => {
    overviewMock.mockResolvedValue({
      code: '0',
      data: { gmv: '1000000', orderCount: 50, activeUsers: 20, onlineRiders: 5, exceptionOrders: 1 },
    });
    const wrapper = mount(Dashboard);
    await flush();
    await flush();
    expect(overviewMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('数据大屏');
  });
});
