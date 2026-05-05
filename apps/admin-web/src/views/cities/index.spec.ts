/** cities/index 页 — 列表渲染 + 新增按钮 + GeoJSON 文本输入 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCitiesMock = vi.fn();
const createCityMock = vi.fn();
const updateCityMock = vi.fn();
const disableCityMock = vi.fn();

vi.mock('@/api/admin-cities', () => ({
  listCities: (...a: unknown[]) => listCitiesMock(...a),
  createCity: (...a: unknown[]) => createCityMock(...a),
  updateCity: (...a: unknown[]) => updateCityMock(...a),
  disableCity: (...a: unknown[]) => disableCityMock(...a),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    has: (perm: string) => perm === 'admin:cities:manage',
  }),
}));

import Cities from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('cities/index', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listCitiesMock.mockReset();
    createCityMock.mockReset();
    updateCityMock.mockReset();
    disableCityMock.mockReset();
  });

  it('挂载即拉 listCities + 渲染表头', async () => {
    listCitiesMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    const wrapper = mount(Cities);
    await flush();
    expect(listCitiesMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('城市站点管理');
  });

  it('返回 1 条 → 表格中显示 cityCode + cityName', async () => {
    listCitiesMock.mockResolvedValue({
      code: '0',
      data: {
        pageNo: 1,
        pageSize: 20,
        total: 1,
        list: [
          {
            cityCode: 'BJ',
            cityName: '北京',
            province: '北京',
            serviceEnabled: true,
            serviceArea: null,
            displayOrder: 0,
            updatedAt: '0',
          },
        ],
      },
    });
    const wrapper = mount(Cities);
    await flush();
    expect(wrapper.text()).toContain('BJ');
    expect(wrapper.text()).toContain('北京');
  });

  it('serviceArea 为 null → 显示"全城"', async () => {
    listCitiesMock.mockResolvedValue({
      code: '0',
      data: {
        pageNo: 1,
        pageSize: 20,
        total: 1,
        list: [
          {
            cityCode: 'SH',
            cityName: '上海',
            province: '上海',
            serviceEnabled: true,
            serviceArea: null,
            displayOrder: 0,
            updatedAt: '0',
          },
        ],
      },
    });
    const wrapper = mount(Cities);
    await flush();
    expect(wrapper.text()).toContain('全城');
  });

  it('点新增按钮 → 弹 dialog 显示 cityCode 输入', async () => {
    listCitiesMock.mockResolvedValue({ code: '0', data: { pageNo: 1, pageSize: 20, total: 0, list: [] } });
    const wrapper = mount(Cities, { attachTo: document.body });
    await flush();
    const buttons = wrapper.findAll('button');
    const addBtn = buttons.find((b) => b.text().includes('新增'));
    expect(addBtn).toBeTruthy();
    await addBtn!.trigger('click');
    await flush();
    // dialog 渲染到 body,通过全局选择器查找
    const dialog = document.body.querySelector('.el-dialog');
    expect(dialog).toBeTruthy();
    wrapper.unmount();
  });
});
