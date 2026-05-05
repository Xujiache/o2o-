/** roles-permissions 页 — 左角色列表 + 右权限树勾选 */
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listRolesMock = vi.fn();
const listPermissionsMock = vi.fn();
const updateRolePermissionsMock = vi.fn();

vi.mock('@/api/admin-roles', () => ({
  listRoles: (...a: unknown[]) => listRolesMock(...a),
  listPermissions: (...a: unknown[]) => listPermissionsMock(...a),
  updateRolePermissions: (...a: unknown[]) => updateRolePermissionsMock(...a),
}));

vi.mock('@/stores/user', () => ({
  useUserStore: () => ({ has: (p: string) => p === 'admin:roles:manage' }),
}));

import RolesPermissions from './index.vue';

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

describe('roles-permissions view', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    listRolesMock.mockReset();
    listPermissionsMock.mockReset();
    updateRolePermissionsMock.mockReset();
  });

  it('挂载即并行拉 roles + permissions', async () => {
    listRolesMock.mockResolvedValue({ code: '0', data: { list: [] } });
    listPermissionsMock.mockResolvedValue({ code: '0', data: { groups: [] } });
    const wrapper = mount(RolesPermissions);
    await flush();
    expect(listRolesMock).toHaveBeenCalledTimes(1);
    expect(listPermissionsMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('角色列表');
  });

  it('返回 2 角色 + 1 group → 渲染角色 + 分组标题', async () => {
    listRolesMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            roleId: '1',
            code: 'SUPER_ADMIN',
            name: '超级管理员',
            scope: 'admin',
            enabled: true,
            permissionCodes: ['admin:menu:audit-logs'],
          },
          {
            roleId: '2',
            code: 'AUDITOR',
            name: '审核员',
            scope: 'admin',
            enabled: true,
            permissionCodes: [],
          },
        ],
      },
    });
    listPermissionsMock.mockResolvedValue({
      code: '0',
      data: {
        groups: [
          {
            group: 'admin',
            permissions: [{ code: 'admin:menu:audit-logs', name: '操作日志', type: 'menu', scope: 'admin' }],
          },
        ],
      },
    });
    const wrapper = mount(RolesPermissions);
    await flush();
    expect(wrapper.text()).toContain('SUPER_ADMIN');
    expect(wrapper.text()).toContain('AUDITOR');
    expect(wrapper.text()).toContain('平台 Web');
    expect(wrapper.text()).toContain('admin:menu:audit-logs');
  });

  it('内置角色清空权限 → 不调 update(校验阻断)', async () => {
    listRolesMock.mockResolvedValue({
      code: '0',
      data: {
        list: [
          {
            roleId: '1',
            code: 'SUPER_ADMIN',
            name: '超级管理员',
            scope: 'admin',
            enabled: true,
            permissionCodes: [],
          },
        ],
      },
    });
    listPermissionsMock.mockResolvedValue({
      code: '0',
      data: {
        groups: [
          {
            group: 'admin',
            permissions: [{ code: 'admin:menu:audit-logs', name: '操作日志', type: 'menu', scope: 'admin' }],
          },
        ],
      },
    });
    const wrapper = mount(RolesPermissions);
    await flush();
    const buttons = wrapper.findAll('button');
    const saveBtn = buttons.find((b) => b.text() === '保存');
    expect(saveBtn).toBeTruthy();
    await saveBtn!.trigger('click');
    await flush();
    // 校验阻断:warning 提示但不调 update
    expect(updateRolePermissionsMock).not.toHaveBeenCalled();
  });
});
