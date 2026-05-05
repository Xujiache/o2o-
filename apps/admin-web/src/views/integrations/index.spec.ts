/** integrations 页 — 列表渲染 + 编辑抽屉 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listIntegrationsMock = vi.fn();
const patchIntegrationMock = vi.fn();
const getIntegrationsHealthMock = vi.fn();

vi.mock('@/api/admin-third-party', () => ({
  listIntegrations: (...a: unknown[]) => listIntegrationsMock(...a),
  getIntegration: vi.fn(),
  patchIntegration: (...a: unknown[]) => patchIntegrationMock(...a),
}));

vi.mock('@/api', () => ({
  getIntegrationsHealth: (...a: unknown[]) => getIntegrationsHealthMock(...a),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ has: (p: string) => p === 'admin:third-party:manage' }),
}));

import Integrations from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('integrations view', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listIntegrationsMock.mockReset();
    patchIntegrationMock.mockReset();
    getIntegrationsHealthMock.mockReset();
  });

  it('挂载即并行拉 list + health', async () => {
    listIntegrationsMock.mockResolvedValue({ code: '0', data: { list: [] } });
    getIntegrationsHealthMock.mockResolvedValue({ code: '0', data: [] });
    const wrapper = mount(Integrations);
    await flush();
    expect(listIntegrationsMock).toHaveBeenCalledTimes(1);
    expect(getIntegrationsHealthMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('第三方配置');
  });

  it('返回 1 个 provider → 表中显示 secretMasked', async () => {
    listIntegrationsMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            provider: 'ali-realname',
            env: 'development',
            status: 'active',
            secretMasked: 'abc***xyz',
            lastHealthAt: null,
            errorMessage: null,
            updatedAt: '0',
          },
        ],
      },
    });
    getIntegrationsHealthMock.mockResolvedValue({ code: '0', data: [] });
    const wrapper = mount(Integrations);
    await flush();
    expect(wrapper.text()).toContain('ali-realname');
    expect(wrapper.text()).toContain('abc***xyz');
  });

  it('点编辑按钮 → 抽屉打开,显示 secret 输入', async () => {
    listIntegrationsMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            provider: 'wxpay',
            env: 'development',
            status: 'active',
            secretMasked: '',
            lastHealthAt: null,
            errorMessage: null,
            updatedAt: '0',
          },
        ],
      },
    });
    getIntegrationsHealthMock.mockResolvedValue({ code: '0', data: [] });
    const wrapper = mount(Integrations, { attachTo: document.body });
    await flush();
    const buttons = wrapper.findAll('button');
    const editBtn = buttons.find((b) => b.text().includes('编辑'));
    expect(editBtn).toBeTruthy();
    await editBtn!.trigger('click');
    await flush();
    const drawer = document.body.querySelector('.el-drawer');
    expect(drawer).toBeTruthy();
    wrapper.unmount();
  });
});
