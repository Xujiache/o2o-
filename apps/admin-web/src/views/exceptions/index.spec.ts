import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
vi.mock('@/api/admin-risk', () => ({ listRiskExceptions: (...a: unknown[]) => listMock(...a) }));

import Exceptions from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('exceptions/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listMock.mockReset();
  });
  it('挂载即拉 listRiskExceptions', async () => {
    listMock.mockResolvedValue({ code: '0', data: { items: [], total: 0, pageNo: 1, pageSize: 20 } });
    const wrapper = mount(Exceptions);
    await flush();
    expect(listMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('异常订单监控');
  });
});
