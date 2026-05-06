import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();
const getMock = vi.fn();
vi.mock('@/api/admin-exports', () => ({
  createExport: (...a: unknown[]) => createMock(...a),
  getExport: (...a: unknown[]) => getMock(...a),
}));

import Exports from './index.vue';

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('exports/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    createMock.mockReset();
    getMock.mockReset();
  });
  it('页面渲染含「报表导出中心」', async () => {
    const wrapper = mount(Exports);
    await flush();
    expect(wrapper.text()).toContain('报表导出中心');
  });
});
