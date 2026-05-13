/**
 * Sidebar 分组菜单配置 — 单一来源,driven by router meta + 手动分组。
 * 修改菜单只需改本文件 + router 即可。
 */

export interface MenuChild {
  path: string;
  title: string;
  icon?: string;
  permission?: string;
}
export interface MenuGroup {
  key: string;
  title: string;
  icon: string;
  children: MenuChild[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    key: 'overview',
    title: '总览',
    icon: 'Odometer',
    children: [
      { path: '/workbench', title: '工作台', icon: 'Monitor' },
      { path: '/admin/dashboard', title: '数据大屏', icon: 'DataAnalysis', permission: 'admin:menu:dashboard' },
    ],
  },
  {
    key: 'order',
    title: '订单',
    icon: 'Tickets',
    children: [
      { path: '/admin/food-orders', title: '外卖订单', icon: 'Bowl', permission: 'admin:menu:food-orders' },
      { path: '/admin/errand-orders', title: '跑腿订单', icon: 'Van', permission: 'admin:menu:errand-orders' },
      { path: '/admin/after-sales', title: '售后订单', icon: 'Refresh', permission: 'admin:menu:after-sales' },
      { path: '/admin/exceptions', title: '异常订单', icon: 'CircleClose', permission: 'admin:menu:risk' },
    ],
  },
  {
    key: 'dispatch',
    title: '调度配送',
    icon: 'Compass',
    children: [
      { path: '/admin/dispatch', title: '调度监控', icon: 'Compass', permission: 'admin:menu:dispatch' },
      { path: '/admin/track-replay', title: '轨迹回放', icon: 'Position', permission: 'admin:menu:track-replay' },
      { path: '/admin/violations', title: '违规记录', icon: 'Warning', permission: 'admin:menu:violations' },
    ],
  },
  {
    key: 'merchant',
    title: '商家',
    icon: 'Shop',
    children: [
      { path: '/admin/merchants/audit', title: '商家审核', icon: 'Shop', permission: 'admin:merchants:view' },
      { path: '/admin/merchants/stores', title: '店铺管控', icon: 'Goods', permission: 'admin:merchants:view' },
      {
        path: '/admin/merchants/statistics',
        title: '经营快照',
        icon: 'TrendCharts',
        permission: 'admin:settlements:view',
      },
    ],
  },
  {
    key: 'rider',
    title: '骑手',
    icon: 'Avatar',
    children: [
      { path: '/admin/riders/audit', title: '骑手审核', icon: 'Avatar', permission: 'admin:riders:view' },
      { path: '/admin/riders/status', title: '账号管控', icon: 'UserFilled', permission: 'admin:riders:view' },
      {
        path: '/admin/riders/delivery-area',
        title: '配送区域',
        icon: 'MapLocation',
        permission: 'admin:riders:manage',
      },
    ],
  },
  {
    key: 'customer',
    title: '用户',
    icon: 'User',
    children: [{ path: '/admin/customers', title: '用户管理', icon: 'User', permission: 'admin:customers:view' }],
  },
  {
    key: 'finance',
    title: '财务',
    icon: 'Money',
    children: [
      { path: '/admin/settlements', title: '结算单', icon: 'Money', permission: 'admin:menu:settlements' },
      { path: '/admin/withdrawals', title: '提现单', icon: 'CreditCard', permission: 'admin:menu:withdrawals' },
      { path: '/admin/refunds', title: '退款执行', icon: 'CreditCard', permission: 'admin:menu:refunds' },
      { path: '/admin/rate-rules', title: '费率配置', icon: 'Money', permission: 'admin:menu:rate-rules' },
    ],
  },
  {
    key: 'ops',
    title: '运营',
    icon: 'Promotion',
    children: [
      { path: '/admin/marketing/coupons', title: '优惠券', icon: 'Discount', permission: 'admin:menu:marketing' },
      { path: '/admin/categories/takeaway', title: '外卖类目', icon: 'Bowl', permission: 'admin:menu:categories' },
      { path: '/admin/categories/errand', title: '跑腿类目', icon: 'Van', permission: 'admin:menu:categories' },
      { path: '/admin/cities', title: '城市站点', icon: 'Position', permission: 'admin:menu:cities' },
      { path: '/admin/exports', title: '报表导出', icon: 'Download', permission: 'admin:menu:exports' },
    ],
  },
  {
    key: 'trace',
    title: '溯源中心',
    icon: 'Box',
    children: [
      { path: '/admin/trace/batches', title: '批次管理', icon: 'Box', permission: 'admin:menu:trace' },
      { path: '/admin/trace/records/create', title: '节点录入', icon: 'Edit', permission: 'admin:menu:trace' },
      { path: '/admin/trace/lookup', title: '二维码定位', icon: 'Search', permission: 'admin:menu:trace' },
      { path: '/admin/trace/stats', title: '扫码统计', icon: 'DataLine', permission: 'admin:menu:trace' },
    ],
  },
  {
    key: 'system',
    title: '系统',
    icon: 'Setting',
    children: [
      {
        path: '/admin/roles-permissions',
        title: '角色权限',
        icon: 'Lock',
        permission: 'admin:menu:roles-permissions',
      },
      { path: '/admin/system-config', title: '系统参数', icon: 'Setting', permission: 'admin:menu:system-config' },
      { path: '/admin/integrations', title: '第三方配置', icon: 'Connection', permission: 'admin:menu:integrations' },
      { path: '/admin/audit-logs', title: '操作日志', icon: 'Document', permission: 'admin:menu:audit-logs' },
    ],
  },
];
