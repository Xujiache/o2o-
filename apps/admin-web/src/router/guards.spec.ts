/**
 * 路由权限守卫单测:
 *   - 未登录访问受保护页 → /login
 *   - 已登录但缺权限 → /error/403
 *   - 已登录且有权限 → 通过
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useUserStore } from '@/stores/user';

import { setupGuards } from './guards';

const Stub = { template: '<div />' };

function buildRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: Stub, meta: { public: true } },
      { path: '/workbench', component: Stub },
      {
        path: '/admin/audit-logs',
        component: Stub,
        meta: { permission: 'admin:audit:logs:view' },
      },
      { path: '/error/403', component: Stub, meta: { public: true } },
    ],
  });
  setupGuards(router);
  return router;
}

describe('routerGuards', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('未登录访问 /workbench → 重定向到 /login', async () => {
    const router = buildRouter();
    await router.push('/workbench');
    expect(router.currentRoute.value.path).toBe('/login');
  });

  it('已登录但缺权限 → /error/403', async () => {
    const userStore = useUserStore();
    userStore.mockLogin({
      token: 'fake',
      principal: { principalId: '40001', scope: 'admin', roles: ['AUDITOR'] },
      permissions: ['admin:integrations:view'],
    });

    const router = buildRouter();
    await router.push('/admin/audit-logs');
    expect(router.currentRoute.value.path).toBe('/error/403');
  });

  it('已登录且有权限 → 通过', async () => {
    const userStore = useUserStore();
    userStore.mockLogin({
      token: 'fake',
      principal: { principalId: '40001', scope: 'admin', roles: ['SUPER_ADMIN'] },
      permissions: ['admin:audit:logs:view'],
    });

    const router = buildRouter();
    await router.push('/admin/audit-logs');
    expect(router.currentRoute.value.path).toBe('/admin/audit-logs');
  });
});
