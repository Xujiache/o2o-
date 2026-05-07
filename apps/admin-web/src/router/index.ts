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
      {
        path: 'admin/merchants/statistics',
        component: () => import('@/views/merchants/statistics.vue'),
        meta: { title: '商家经营快照', menu: true, icon: 'TrendCharts', permission: 'admin:settlements:view' },
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
      // Stage 7 — 商家售后/结算/提现监控
      {
        path: 'admin/after-sales',
        component: () => import('@/views/after-sales/index.vue'),
        meta: {
          title: '售后订单',
          menu: true,
          icon: 'Refresh',
          permission: 'admin:menu:after-sales',
        },
      },
      {
        path: 'admin/settlements',
        component: () => import('@/views/settlements/index.vue'),
        meta: {
          title: '结算单',
          menu: true,
          icon: 'Money',
          permission: 'admin:menu:settlements',
        },
      },
      {
        path: 'admin/withdrawals',
        component: () => import('@/views/withdrawals/index.vue'),
        meta: {
          title: '提现单',
          menu: true,
          icon: 'CreditCard',
          permission: 'admin:menu:withdrawals',
        },
      },
      // Stage 8 — 调度监控 / 轨迹回放 / 违规记录
      {
        path: 'admin/dispatch',
        component: () => import('@/views/dispatch/index.vue'),
        meta: {
          title: '调度监控',
          menu: true,
          icon: 'Compass',
          permission: 'admin:menu:dispatch',
        },
      },
      {
        path: 'admin/track-replay',
        component: () => import('@/views/track-replay/index.vue'),
        meta: {
          title: '轨迹回放',
          menu: true,
          icon: 'Position',
          permission: 'admin:menu:track-replay',
        },
      },
      {
        path: 'admin/violations',
        component: () => import('@/views/violations/index.vue'),
        meta: {
          title: '违规记录',
          menu: true,
          icon: 'Warning',
          permission: 'admin:menu:violations',
        },
      },
      {
        path: 'admin/marketing/coupons',
        component: () => import('@/views/marketing/coupons/index.vue'),
        meta: { title: '优惠券', menu: true, icon: 'Discount', permission: 'admin:menu:marketing' },
      },
      {
        path: 'admin/rate-rules',
        component: () => import('@/views/rate-rules/index.vue'),
        meta: { title: '费率配置', menu: true, icon: 'Money', permission: 'admin:menu:rate-rules' },
      },
      {
        path: 'admin/refunds',
        component: () => import('@/views/refunds/index.vue'),
        meta: { title: '退款执行', menu: true, icon: 'CreditCard', permission: 'admin:menu:refunds' },
      },
      {
        path: 'admin/exceptions',
        component: () => import('@/views/exceptions/index.vue'),
        meta: { title: '异常订单', menu: true, icon: 'CircleClose', permission: 'admin:menu:risk' },
      },
      {
        path: 'admin/dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据大屏', menu: true, icon: 'DataAnalysis', permission: 'admin:menu:dashboard' },
      },
      {
        path: 'admin/exports',
        component: () => import('@/views/exports/index.vue'),
        meta: { title: '报表导出', menu: true, icon: 'Download', permission: 'admin:menu:exports' },
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
