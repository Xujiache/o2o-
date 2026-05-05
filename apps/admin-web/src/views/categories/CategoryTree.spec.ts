/** CategoryTree 组件 — 树形渲染 + 顶级 / 二级 + 启用/禁用 tag */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listCategoryTreeMock = vi.fn();

vi.mock('@/api/admin-categories', () => ({
  listCategoryTree: (...a: unknown[]) => listCategoryTreeMock(...a),
  createCategory: vi.fn(async () => ({ code: '0', data: { categoryId: '99', updatedAt: '0' } })),
  updateCategory: vi.fn(async () => ({ code: '0', data: { categoryId: '1', updatedAt: '0' } })),
  disableCategory: vi.fn(async () => ({ code: '0', data: { categoryId: '1', updatedAt: '0' } })),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({
    has: (p: string) => p === 'admin:categories:manage',
  }),
}));

import CategoryTree from './components/CategoryTree.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('CategoryTree', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listCategoryTreeMock.mockReset();
  });

  it('挂载即按 bizType 拉树', async () => {
    listCategoryTreeMock.mockResolvedValue({ code: '0', data: { bizType: 'takeaway', list: [] } });
    mount(CategoryTree, { props: { bizType: 'takeaway' } });
    await flush();
    expect(listCategoryTreeMock).toHaveBeenCalledWith('takeaway');
  });

  it('两层数据 → 父子节点都渲染', async () => {
    listCategoryTreeMock.mockResolvedValue({
      code: '0',
      data: {
        bizType: 'takeaway',
        list: [
          {
            categoryId: '1',
            bizType: 'takeaway',
            parentId: '0',
            name: '快餐',
            displayOrder: 0,
            enabled: true,
            children: [
              { categoryId: '2', bizType: 'takeaway', parentId: '1', name: '汉堡', displayOrder: 0, enabled: true },
            ],
          },
        ],
      },
    });
    const wrapper = mount(CategoryTree, { props: { bizType: 'takeaway' } });
    await flush();
    expect(wrapper.text()).toContain('快餐');
    expect(wrapper.text()).toContain('汉堡');
  });

  it('禁用项 → 禁用 tag 显示', async () => {
    listCategoryTreeMock.mockResolvedValue({
      code: '0',
      data: {
        bizType: 'errand',
        list: [
          {
            categoryId: '10',
            bizType: 'errand',
            parentId: '0',
            name: '帮取件',
            displayOrder: 0,
            enabled: false,
          },
        ],
      },
    });
    const wrapper = mount(CategoryTree, { props: { bizType: 'errand' } });
    await flush();
    expect(wrapper.text()).toContain('禁用');
  });

  it('空列表 → 暂无类目', async () => {
    listCategoryTreeMock.mockResolvedValue({ code: '0', data: { bizType: 'takeaway', list: [] } });
    const wrapper = mount(CategoryTree, { props: { bizType: 'takeaway' } });
    await flush();
    expect(wrapper.text()).toContain('暂无类目');
  });
});
