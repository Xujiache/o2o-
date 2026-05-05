/** system-config 页 — 列表渲染 + 行内编辑可见 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listSystemConfigMock = vi.fn();
const patchSystemConfigMock = vi.fn();

vi.mock('@/api/admin-system-config', () => ({
  listSystemConfig: (...a: unknown[]) => listSystemConfigMock(...a),
  patchSystemConfig: (...a: unknown[]) => patchSystemConfigMock(...a),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ has: (p: string) => p === 'admin:system-config:manage' }),
}));

import SystemConfig from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('system-config view', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listSystemConfigMock.mockReset();
    patchSystemConfigMock.mockReset();
  });

  it('挂载即拉 listSystemConfig', async () => {
    listSystemConfigMock.mockResolvedValue({ code: '0', data: { list: [] } });
    const wrapper = mount(SystemConfig);
    await flush();
    expect(listSystemConfigMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('系统参数');
  });

  it('返回 1 行 → 表中显示 configKey', async () => {
    listSystemConfigMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            configKey: 'order.takeaway.wait_pay_minutes',
            configValue: '15',
            scope: 'global',
            description: '外卖订单待支付超时',
            updatedAt: '0',
          },
        ],
      },
    });
    const wrapper = mount(SystemConfig);
    await flush();
    expect(wrapper.text()).toContain('order.takeaway.wait_pay_minutes');
    expect(wrapper.text()).toContain('外卖订单');
  });

  it('点保存按钮 → 调 patchSystemConfig 当 value 变更', async () => {
    listSystemConfigMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            configKey: 'order.takeaway.wait_pay_minutes',
            configValue: '15',
            scope: 'global',
            description: 'X',
            updatedAt: '0',
          },
        ],
      },
    });
    patchSystemConfigMock.mockResolvedValue({
      code: '0',
      data: { configKey: 'order.takeaway.wait_pay_minutes', configValue: '30', updatedAt: '1' },
    });
    const wrapper = mount(SystemConfig);
    await flush();
    const inputs = wrapper.findAll('input');
    const valueInput = inputs[0]!;
    await valueInput.setValue('30');
    const buttons = wrapper.findAll('button');
    const saveBtn = buttons.find((b) => b.text().includes('保存'));
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger('click');
    await flush();
    expect(patchSystemConfigMock).toHaveBeenCalledWith('order.takeaway.wait_pay_minutes', '30');
  });
});
