import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
vi.mock('@/api/admin-refunds', () => ({ listRefunds: (...a: unknown[]) => listMock(...a) }));

import Refunds from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('refunds/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listMock.mockReset();
  });
  it('挂载即拉 listRefunds', async () => {
    listMock.mockResolvedValue({ code: '0', data: { items: [], total: 0, pageNo: 1, pageSize: 20 } });
    const wrapper = mount(Refunds);
    await flush();
    expect(listMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('退款执行');
  });
});
