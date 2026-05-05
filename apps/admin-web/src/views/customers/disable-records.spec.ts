/** customers/disable-records 页 — list 拉取 + 类型筛选 + 渲染 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listDisableRecordsMock = vi.fn();

vi.mock('@/api/admin-customer-disable', () => ({
  listDisableRecords: (...args: unknown[]) => listDisableRecordsMock(...args),
}));

import DisableRecords from './disable-records.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('disable-records page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listDisableRecordsMock.mockReset();
  });

  it('挂载即拉列表(空数据时不报错)', async () => {
    listDisableRecordsMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    const wrapper = mount(DisableRecords);
    await flush();
    expect(listDisableRecordsMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('账号禁用启用流水');
  });

  it('返回数据 → 渲染 disable / enable 标签', async () => {
    listDisableRecordsMock.mockResolvedValue({
      code: '0',
      data: {
        pageNo: 1,
        pageSize: 20,
        total: 2,
        list: [
          {
            accountDisableRecordId: '1',
            accountType: 'customer',
            accountId: '10001',
            action: 'disable',
            reason: '违规',
            operatorAdminId: 'admin-1',
            operatorUsername: 'super_admin',
            createdAt: '1700000000000',
          },
          {
            accountDisableRecordId: '2',
            accountType: 'rider',
            accountId: '30001',
            action: 'enable',
            operatorAdminId: 'admin-1',
            operatorUsername: 'super_admin',
            createdAt: '1700000100000',
          },
        ],
      },
    });
    const wrapper = mount(DisableRecords);
    await flush();
    const text = wrapper.text();
    expect(text).toContain('禁用');
    expect(text).toContain('启用');
    expect(text).toContain('违规');
  });

  it('查询按钮 → 重置 pageNo 后重新调接口', async () => {
    listDisableRecordsMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    const wrapper = mount(DisableRecords);
    await flush();
    listDisableRecordsMock.mockClear();
    const buttons = wrapper.findAll('button');
    const queryBtn = buttons.find((b) => b.text().includes('查询'));
    expect(queryBtn).toBeTruthy();
    await queryBtn!.trigger('click');
    await flush();
    expect(listDisableRecordsMock).toHaveBeenCalledTimes(1);
    expect(listDisableRecordsMock.mock.calls[0]![0]).toMatchObject({ pageNo: 1, pageSize: 20 });
  });
});
