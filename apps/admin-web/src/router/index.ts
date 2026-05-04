import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

import { setupGuards } from './guards';

const Layout = () => import('@/layout/index.vue');

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: Layout,
    redirect: '/workbench',
    children: [
      {
        path: 'workbench',
        component: () => import('@/views/workbench/index.vue'),
        meta: { title: '工作台', menu: true, icon: 'Monitor' },
      },
      {
        path: 'admin/audit-logs',
        component: () => import('@/views/audit-logs/index.vue'),
        meta: {
          title: '操作日志',
          menu: true,
          icon: 'Document',
          permission: 'admin:audit:logs:view',
        },
      },
      {
        path: 'admin/integrations',
        component: () => import('@/views/integrations/index.vue'),
        meta: {
          title: '第三方配置',
          menu: true,
          icon: 'Connection',
          permission: 'admin:integrations:view',
        },
      },
      {
        path: 'admin/system-config',
        component: () => import('@/views/system-config/index.vue'),
        meta: {
          title: '系统参数',
          menu: true,
          icon: 'Setting',
          permission: 'admin:system:config:view',
        },
      },
      {
        path: 'admin/roles-permissions',
        component: () => import('@/views/roles-permissions/index.vue'),
        meta: {
          title: '角色权限',
          menu: true,
          icon: 'Lock',
          permission: 'admin:roles:permissions:view',
        },
      },
    ],
  },
  {
    path: '/error/403',
    component: () => import('@/views/error/403.vue'),
    meta: { public: true, title: '无权限' },
  },
  {
    path: '/error/network',
    component: () => import('@/views/error/network.vue'),
    meta: { public: true, title: '网络错误' },
  },
  {
    path: '/error/maintenance',
    component: () => import('@/views/error/maintenance.vue'),
    meta: { public: true, title: '系统维护' },
  },
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '页面不存在' },
  },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

setupGuards(router);
