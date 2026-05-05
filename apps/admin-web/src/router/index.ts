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
      // Stage 1 — 用户管理
      {
        path: 'admin/customers',
        component: () => import('@/views/customers/index.vue'),
        meta: { title: '用户管理', menu: true, icon: 'User', permission: 'admin:customers:view' },
      },
      {
        path: 'admin/customers/:id',
        component: () => import('@/views/customers/detail.vue'),
        meta: { title: '用户详情', permission: 'admin:customers:view' },
      },
      {
        path: 'admin/customers/:id/realname',
        component: () => import('@/views/customers/realname-records.vue'),
        meta: { title: '实名记录', permission: 'admin:customers:view' },
      },
      // Stage 2 — 商家管理
      {
        path: 'admin/merchants/audit',
        component: () => import('@/views/merchants/audit.vue'),
        meta: { title: '商家审核', menu: true, icon: 'Shop', permission: 'admin:merchants:view' },
      },
      {
        path: 'admin/merchants/applications/:id',
        component: () => import('@/views/merchants/detail.vue'),
        meta: { title: '商家详情', permission: 'admin:merchants:view' },
      },
      {
        path: 'admin/merchants/stores',
        component: () => import('@/views/merchants/stores.vue'),
        meta: { title: '店铺管控', menu: true, icon: 'Goods', permission: 'admin:merchants:view' },
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
