import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listMock = vi.fn();
const patchMock = vi.fn();
vi.mock('@/api/admin-rate-rules', () => ({
  listRateRules: (...a: unknown[]) => listMock(...a),
  patchRateRule: (...a: unknown[]) => patchMock(...a),
}));

import RateRules from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('rate-rules/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listMock.mockReset();
    patchMock.mockReset();
  });
  it('挂载即拉 listRateRules', async () => {
    listMock.mockResolvedValue({ code: '0', data: { items: [], total: 0, pageNo: 1, pageSize: 20 } });
    const wrapper = mount(RateRules);
    await flush();
    expect(listMock).toHaveBeenCalled();
    expect(wrapper.text()).toContain('费率配置');
  });
});
