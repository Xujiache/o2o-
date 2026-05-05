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
          permission: 'admin:menu:audit-logs',
        },
      },
      {
        path: 'admin/integrations',
        component: () => import('@/views/integrations/index.vue'),
        meta: {
          title: '第三方配置',
          menu: true,
          icon: 'Connection',
          permission: 'admin:menu:integrations',
        },
      },
      {
        path: 'admin/system-config',
        component: () => import('@/views/system-config/index.vue'),
        meta: {
          title: '系统参数',
          menu: true,
          icon: 'Setting',
          permission: 'admin:menu:system-config',
        },
      },
      {
        path: 'admin/roles-permissions',
        component: () => import('@/views/roles-permissions/index.vue'),
        meta: {
          title: '角色权限',
          menu: true,
          icon: 'Lock',
          permission: 'admin:menu:roles-permissions',
        },
      },
      // Stage 1 — 用户管理
      {
        path: 'admin/customers',
        component: () => import('@/views/customers/index.vue'),
        meta: { title: '用户管理', menu: true, icon: 'User', permission: 'admin:customers:view' },
      },
      {
        path: 'admin/customers/disable-records',
        component: () => import('@/views/customers/disable-records.vue'),
        meta: { title: '禁用记录', permission: 'admin:customers:view' },
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
      // Stage 3 — 骑手管理
      {
        path: 'admin/riders/audit',
        component: () => import('@/views/riders/audit.vue'),
        meta: { title: '骑手审核', menu: true, icon: 'Avatar', permission: 'admin:riders:view' },
      },
      {
        path: 'admin/riders/applications/:id',
        component: () => import('@/views/riders/detail.vue'),
        meta: { title: '骑手详情', permission: 'admin:riders:view' },
      },
      {
        path: 'admin/riders/status',
        component: () => import('@/views/riders/status.vue'),
        meta: { title: '骑手账号管控', menu: true, icon: 'UserFilled', permission: 'admin:riders:view' },
      },
      {
        path: 'admin/riders/delivery-area',
        component: () => import('@/views/riders/delivery-area.vue'),
        meta: { title: '骑手配送区域', menu: true, icon: 'MapLocation', permission: 'admin:riders:manage' },
      },
      // Stage 4 — 城市站点 / 类目
      {
        path: 'admin/cities',
        component: () => import('@/views/cities/index.vue'),
        meta: { title: '城市站点', menu: true, icon: 'Position', permission: 'admin:menu:cities' },
      },
      {
        path: 'admin/categories/takeaway',
        component: () => import('@/views/categories/takeaway.vue'),
        meta: { title: '外卖类目', menu: true, icon: 'Bowl', permission: 'admin:menu:categories' },
      },
      {
        path: 'admin/categories/errand',
        component: () => import('@/views/categories/errand.vue'),
        meta: { title: '跑腿类目', menu: true, icon: 'Van', permission: 'admin:menu:categories' },
      },
      // Stage 5 — 外卖订单监控
      {
        path: 'admin/food-orders',
        component: () => import('@/views/food-orders/index.vue'),
        meta: {
          title: '外卖订单',
          menu: true,
          icon: 'Bowl',
          permission: 'admin:menu:food-orders',
        },
      },
      // Stage 6 — 跑腿订单监控
      {
        path: 'admin/errand-orders',
        component: () => import('@/views/errand-orders/index.vue'),
        meta: {
          title: '跑腿订单',
          menu: true,
          icon: 'Van',
          permission: 'admin:menu:errand-orders',
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
