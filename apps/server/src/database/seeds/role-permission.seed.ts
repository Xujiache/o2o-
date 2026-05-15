import type { DataSource } from 'typeorm';

import {
  SysPermission,
  SysRole,
  SysRolePermission,
  type PermissionScope,
  type PermissionType,
  type RoleScope,
} from '../entities';

const NOW = Date.now().toString();

interface RoleRow {
  code: string;
  name: string;
  scope: RoleScope;
}

interface PermRow {
  code: string;
  name: string;
  scope: PermissionScope;
  type: PermissionType;
  parentCode?: string;
  sort?: number;
}

const ROLES: RoleRow[] = [
  { code: 'SUPER_ADMIN', name: '超级管理员', scope: 'admin' },
  { code: 'AUDITOR', name: '审核员', scope: 'admin' },
  { code: 'OPERATOR', name: '自营运营员', scope: 'admin' },
  { code: 'CUSTOMER', name: '普通用户', scope: 'customer' },
  { code: 'MERCHANT', name: '商家', scope: 'merchant' },
  { code: 'RIDER', name: '骑手', scope: 'rider' },
];

/**
 * Stage 0 涉及的权限点(其余 menu/button 权限在对应业务阶段补充)
 * 来源:接口契约清单.md + 阶段规划.md(平台 Web 4 个预留页面)
 */
const PERMISSIONS: PermRow[] = [
  // 公共
  { code: 'public:read', name: '公共读取', scope: 'public', type: 'data', sort: 0 },
  // 文件上传(4 端可用,具体 bizType 归属由 FileBizScopeMap 校验)
  { code: 'principal:file:upload', name: '当前主体上传文件', scope: 'public', type: 'button', sort: 10 },
  // 平台 Web 菜单
  { code: 'admin:menu:audit-logs', name: '操作日志菜单', scope: 'admin', type: 'menu', sort: 100 },
  { code: 'admin:menu:integrations', name: '第三方配置菜单', scope: 'admin', type: 'menu', sort: 110 },
  { code: 'admin:menu:system-config', name: '系统参数菜单', scope: 'admin', type: 'menu', sort: 120 },
  { code: 'admin:menu:roles-permissions', name: '角色权限菜单', scope: 'admin', type: 'menu', sort: 130 },
  // 平台 Web 按钮/数据
  {
    code: 'admin:audit:logs:view',
    name: '审计日志查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:audit-logs',
    sort: 1,
  },
  {
    code: 'admin:integrations:view',
    name: '第三方配置查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:integrations',
    sort: 1,
  },
  // Stage 1 — 用户端公共/本人作用域
  { code: 'customer:public', name: '用户端公开接口', scope: 'public', type: 'data', sort: 200 },
  { code: 'customer:self', name: '用户访问本人数据', scope: 'customer', type: 'data', sort: 210 },
  // Stage 1 — 平台 Web 用户管理
  { code: 'admin:menu:customers', name: '用户管理菜单', scope: 'admin', type: 'menu', sort: 200 },
  {
    code: 'admin:customers:view',
    name: '用户列表/详情/实名记录查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:customers',
    sort: 1,
  },
  {
    code: 'admin:customers:disable',
    name: '用户启用/禁用',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:customers',
    sort: 2,
  },
  // Stage 2 — 商家端
  { code: 'merchant:public', name: '商家端公开接口', scope: 'public', type: 'data', sort: 300 },
  { code: 'merchant:store:own', name: '商家访问自己店铺数据', scope: 'merchant', type: 'data', sort: 310 },
  // Stage 2 — 平台 Web 商家管理
  { code: 'admin:menu:merchants', name: '商家管理菜单', scope: 'admin', type: 'menu', sort: 300 },
  {
    code: 'admin:merchants:view',
    name: '商家列表/详情/资质查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:merchants',
    sort: 1,
  },
  {
    code: 'admin:merchants:manage',
    name: '商家审核/驳回/管控',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:merchants',
    sort: 2,
  },
  // Stage 3 — 骑手端
  { code: 'rider:public', name: '骑手端公开接口', scope: 'public', type: 'data', sort: 400 },
  { code: 'rider:self', name: '骑手访问本人数据', scope: 'rider', type: 'data', sort: 410 },
  // Stage 3 — 平台 Web 骑手管理
  { code: 'admin:menu:riders', name: '骑手管理菜单', scope: 'admin', type: 'menu', sort: 400 },
  {
    code: 'admin:riders:view',
    name: '骑手列表/详情/资质查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:riders',
    sort: 1,
  },
  {
    code: 'admin:riders:manage',
    name: '骑手审核/启停/配送区域',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:riders',
    sort: 2,
  },
  // Stage 4 — 平台 Web 城市站点
  { code: 'admin:menu:cities', name: '城市站点菜单', scope: 'admin', type: 'menu', sort: 500 },
  {
    code: 'admin:cities:manage',
    name: '城市站点 CRUD',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:cities',
    sort: 1,
  },
  // Stage 4 — 平台 Web 类目
  { code: 'admin:menu:categories', name: '类目管理菜单', scope: 'admin', type: 'menu', sort: 510 },
  {
    code: 'admin:categories:manage',
    name: '平台类目 CRUD',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:categories',
    sort: 1,
  },
  // Stage 4 — 平台 Web 系统参数(stage 0 已有 menu,本阶段加 manage)
  {
    code: 'admin:system-config:manage',
    name: '系统参数编辑',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:system-config',
    sort: 1,
  },
  // Stage 4 — 平台 Web 第三方配置(stage 0 已有 menu + view,本阶段加 manage)
  {
    code: 'admin:third-party:manage',
    name: '第三方配置编辑',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:integrations',
    sort: 2,
  },
  // Stage 4 — 平台 Web 角色权限(stage 0 已有 menu,本阶段加 manage)
  {
    code: 'admin:roles:manage',
    name: '角色权限编辑',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:roles-permissions',
    sort: 1,
  },
  // Stage 5 — 平台 Web 外卖订单监控
  { code: 'admin:menu:food-orders', name: '外卖订单菜单', scope: 'admin', type: 'menu', sort: 600 },
  {
    code: 'admin:food-orders:view',
    name: '外卖订单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:food-orders',
    sort: 1,
  },
  // Stage 6 — 平台 Web 跑腿订单监控
  { code: 'admin:menu:errand-orders', name: '跑腿订单菜单', scope: 'admin', type: 'menu', sort: 610 },
  {
    code: 'admin:errand-orders:view',
    name: '跑腿订单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:errand-orders',
    sort: 1,
  },
  // Stage 7 — 平台 Web 商家售后/结算/提现监控
  { code: 'admin:menu:after-sales', name: '售后订单菜单', scope: 'admin', type: 'menu', sort: 620 },
  {
    code: 'admin:after-sales:view',
    name: '售后订单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:after-sales',
    sort: 1,
  },
  { code: 'admin:menu:settlements', name: '结算单菜单', scope: 'admin', type: 'menu', sort: 630 },
  {
    code: 'admin:settlements:view',
    name: '结算单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:settlements',
    sort: 1,
  },
  { code: 'admin:menu:withdrawals', name: '提现单菜单', scope: 'admin', type: 'menu', sort: 640 },
  {
    code: 'admin:withdrawals:view',
    name: '提现单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:withdrawals',
    sort: 1,
  },
  // Stage 8 — 平台 Web 调度监控/轨迹回放/违规
  { code: 'admin:menu:dispatch', name: '调度监控菜单', scope: 'admin', type: 'menu', sort: 700 },
  {
    code: 'admin:dispatch:view',
    name: '调度监控查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:dispatch',
    sort: 1,
  },
  { code: 'admin:menu:track-replay', name: '轨迹回放菜单', scope: 'admin', type: 'menu', sort: 710 },
  {
    code: 'admin:track-replay:view',
    name: '轨迹回放查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:track-replay',
    sort: 1,
  },
  { code: 'admin:menu:violations', name: '违规记录菜单', scope: 'admin', type: 'menu', sort: 720 },
  {
    code: 'admin:violations:view',
    name: '违规记录查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:violations',
    sort: 1,
  },
  // Stage 9 — 平台 Web 调度售后运营财务 8 个权限点
  {
    code: 'admin:dispatch:manage',
    name: '调度管理(人工派单)',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:dispatch',
    sort: 800,
  },
  {
    code: 'admin:after:sales:manage',
    name: '售后仲裁',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:after-sales',
    sort: 1,
  },
  { code: 'admin:menu:marketing', name: '营销菜单', scope: 'admin', type: 'menu', sort: 820 },
  {
    code: 'admin:marketing:manage',
    name: '营销管理(优惠券)',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:marketing',
    sort: 1,
  },
  { code: 'admin:menu:rate-rules', name: '费率菜单', scope: 'admin', type: 'menu', sort: 830 },
  {
    code: 'admin:rate:rules:manage',
    name: '费率配置',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:rate-rules',
    sort: 1,
  },
  { code: 'admin:menu:dashboard', name: '数据大屏菜单', scope: 'admin', type: 'menu', sort: 840 },
  {
    code: 'admin:dashboard:view',
    name: '数据大屏查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:dashboard',
    sort: 1,
  },
  { code: 'admin:menu:exports', name: '报表导出菜单', scope: 'admin', type: 'menu', sort: 850 },
  {
    code: 'admin:export:manage',
    name: '报表导出',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:exports',
    sort: 1,
  },
  { code: 'admin:menu:refunds', name: '退款执行菜单', scope: 'admin', type: 'menu', sort: 860 },
  {
    code: 'admin:refund:manage',
    name: '退款管理',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:refunds',
    sort: 1,
  },
  { code: 'admin:menu:risk', name: '风控菜单', scope: 'admin', type: 'menu', sort: 870 },
  {
    code: 'admin:risk:view',
    name: '异常订单查询',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:risk',
    sort: 1,
  },
  // Stage 10 — 四端联调:平台订单时间线 + 平台支付单查看 2 个权限点
  {
    code: 'admin:order:timeline:view',
    name: '订单时间线查看',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:food-orders',
    sort: 900,
  },
  {
    code: 'admin:payment:view',
    name: '支付单查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:settlements',
    sort: 901,
  },
  // GR-1 — 平台自营自提点管理
  { code: 'admin:menu:pickup-points', name: '自提点菜单', scope: 'admin', type: 'menu', sort: 1000 },
  {
    code: 'admin:pickup-point:read',
    name: '自提点查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:pickup-points',
    sort: 1,
  },
  {
    code: 'admin:pickup-point:write',
    name: '自提点 CRUD',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:pickup-points',
    sort: 2,
  },
  // GR-1 — 运营员账号管理
  { code: 'admin:menu:operators', name: '运营员菜单', scope: 'admin', type: 'menu', sort: 1010 },
  {
    code: 'admin:operator:manage',
    name: '运营员账号 CRUD(创建/重置密码/启停)',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:operators',
    sort: 1,
  },
  // GR-2 — 平台自营生鲜商品管理
  { code: 'admin:menu:grocery-products', name: '生鲜商品菜单', scope: 'admin', type: 'menu', sort: 1100 },
  {
    code: 'admin:grocery:product:read',
    name: '生鲜商品查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:grocery-products',
    sort: 1,
  },
  {
    code: 'admin:grocery:product:write',
    name: '生鲜商品 CRUD(分类+商品+上下架+库存)',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:grocery-products',
    sort: 2,
  },
  // GR-5 — 一鸡一码溯源
  { code: 'admin:menu:traceability', name: '溯源中心菜单', scope: 'admin', type: 'menu', sort: 1200 },
  {
    code: 'admin:trace:archive:read',
    name: '溯源档案查看',
    scope: 'admin',
    type: 'data',
    parentCode: 'admin:menu:traceability',
    sort: 1,
  },
  {
    code: 'admin:trace:archive:write',
    name: '溯源档案 CRUD',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:traceability',
    sort: 2,
  },
  {
    code: 'admin:trace:qrcode:generate',
    name: '二维码批量生成',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:traceability',
    sort: 3,
  },
  {
    code: 'admin:trace:qrcode:export',
    name: '二维码导出',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:traceability',
    sort: 4,
  },
  {
    code: 'admin:trace:qrcode:bind',
    name: '扫码绑定档案',
    scope: 'admin',
    type: 'button',
    parentCode: 'admin:menu:traceability',
    sort: 5,
  },
];

export async function seedRolesAndPermissions(
  ds: DataSource,
): Promise<{ roles: number; permissions: number; bindings: number }> {
  const roleRepo = ds.getRepository(SysRole);
  const permRepo = ds.getRepository(SysPermission);
  const bindingRepo = ds.getRepository(SysRolePermission);

  // 1. 角色
  for (const r of ROLES) {
    const existing = await roleRepo.findOne({ where: { code: r.code } });
    if (existing) {
      existing.name = r.name;
      existing.scope = r.scope;
      await roleRepo.save(existing);
    } else {
      await roleRepo.insert({ ...r, enabled: 1, createdAt: NOW });
    }
  }

  // 2. 权限
  for (const p of PERMISSIONS) {
    const existing = await permRepo.findOne({ where: { code: p.code } });
    if (existing) {
      Object.assign(existing, p);
      existing.parentCode = p.parentCode ?? null;
      await permRepo.save(existing);
    } else {
      await permRepo.insert({
        code: p.code,
        name: p.name,
        scope: p.scope,
        type: p.type,
        parentCode: p.parentCode ?? null,
        sort: p.sort ?? 0,
      });
    }
  }

  // 3. 默认角色 → 权限绑定
  const allRoles = await roleRepo.find();
  const allPerms = await permRepo.find();
  const roleByCode = new Map(allRoles.map((r) => [r.code, r]));
  const permByCode = new Map(allPerms.map((p) => [p.code, p]));

  const grants: Array<[string, string]> = [
    // SUPER_ADMIN 全量
    ...PERMISSIONS.map((p): [string, string] => ['SUPER_ADMIN', p.code]),
    // AUDITOR 只读 + 菜单
    ['AUDITOR', 'admin:menu:audit-logs'],
    ['AUDITOR', 'admin:audit:logs:view'],
    ['AUDITOR', 'admin:menu:integrations'],
    ['AUDITOR', 'admin:integrations:view'],
    // 用户 / 商家 / 骑手 都可上传归属于自己的文件
    ['CUSTOMER', 'principal:file:upload'],
    ['MERCHANT', 'principal:file:upload'],
    ['RIDER', 'principal:file:upload'],
    // Stage 1 — 用户基本权限
    ['CUSTOMER', 'customer:self'],
    // AUDITOR 可以查看用户(只读),不能禁用
    ['AUDITOR', 'admin:menu:customers'],
    ['AUDITOR', 'admin:customers:view'],
    // Stage 2 — 商家端
    ['MERCHANT', 'merchant:store:own'],
    // AUDITOR 可以查看商家(只读),不能审核
    ['AUDITOR', 'admin:menu:merchants'],
    ['AUDITOR', 'admin:merchants:view'],
    // Stage 3 — 骑手端
    ['RIDER', 'rider:self'],
    // AUDITOR 可以查看骑手(只读),不能审核/启停/配送区域
    ['AUDITOR', 'admin:menu:riders'],
    ['AUDITOR', 'admin:riders:view'],
    // Stage 4 — AUDITOR 可见城市/类目/系统参数(只读项),无 manage
    ['AUDITOR', 'admin:menu:cities'],
    ['AUDITOR', 'admin:menu:categories'],
    // Stage 5 — AUDITOR 可见外卖订单(只读)
    ['AUDITOR', 'admin:menu:food-orders'],
    ['AUDITOR', 'admin:food-orders:view'],
    ['AUDITOR', 'admin:menu:errand-orders'],
    ['AUDITOR', 'admin:errand-orders:view'],
    // Stage 7 — AUDITOR 可见售后/结算/提现(只读)
    ['AUDITOR', 'admin:menu:after-sales'],
    ['AUDITOR', 'admin:after-sales:view'],
    ['AUDITOR', 'admin:menu:settlements'],
    ['AUDITOR', 'admin:settlements:view'],
    ['AUDITOR', 'admin:menu:withdrawals'],
    ['AUDITOR', 'admin:withdrawals:view'],
    // Stage 8 — AUDITOR 可见调度/轨迹回放/违规(只读)
    ['AUDITOR', 'admin:menu:dispatch'],
    ['AUDITOR', 'admin:dispatch:view'],
    ['AUDITOR', 'admin:menu:track-replay'],
    ['AUDITOR', 'admin:track-replay:view'],
    ['AUDITOR', 'admin:menu:violations'],
    ['AUDITOR', 'admin:violations:view'],
    // Stage 9 — AUDITOR 可见 dashboard / risk(view 类只读),manage 类不给
    ['AUDITOR', 'admin:menu:dashboard'],
    ['AUDITOR', 'admin:dashboard:view'],
    ['AUDITOR', 'admin:menu:risk'],
    ['AUDITOR', 'admin:risk:view'],
    // Stage 10 — AUDITOR 可见订单时间线 + 支付单(只读)
    ['AUDITOR', 'admin:order:timeline:view'],
    ['AUDITOR', 'admin:payment:view'],
    // GR-1 — OPERATOR 自营运营员核心权限(自提点 CRUD + 后续阶段商品/订单/拣货/溯源)
    ['OPERATOR', 'admin:menu:pickup-points'],
    ['OPERATOR', 'admin:pickup-point:read'],
    ['OPERATOR', 'admin:pickup-point:write'],
    // AUDITOR 可见自提点(只读)
    ['AUDITOR', 'admin:menu:pickup-points'],
    ['AUDITOR', 'admin:pickup-point:read'],
    // GR-2 — OPERATOR 生鲜商品 CRUD
    ['OPERATOR', 'admin:menu:grocery-products'],
    ['OPERATOR', 'admin:grocery:product:read'],
    ['OPERATOR', 'admin:grocery:product:write'],
    // AUDITOR 可见生鲜商品(只读)
    ['AUDITOR', 'admin:menu:grocery-products'],
    ['AUDITOR', 'admin:grocery:product:read'],
    // GR-5 — OPERATOR 溯源中心全权限
    ['OPERATOR', 'admin:menu:traceability'],
    ['OPERATOR', 'admin:trace:archive:read'],
    ['OPERATOR', 'admin:trace:archive:write'],
    ['OPERATOR', 'admin:trace:qrcode:generate'],
    ['OPERATOR', 'admin:trace:qrcode:export'],
    ['OPERATOR', 'admin:trace:qrcode:bind'],
    // AUDITOR 可见溯源(只读)
    ['AUDITOR', 'admin:menu:traceability'],
    ['AUDITOR', 'admin:trace:archive:read'],
    // SUPER_ADMIN 全量已通过 ...PERMISSIONS.map 覆盖
  ];

  let bindings = 0;
  for (const [roleCode, permCode] of grants) {
    const role = roleByCode.get(roleCode);
    const perm = permByCode.get(permCode);
    if (!role || !perm) continue;
    const existing = await bindingRepo.findOne({ where: { roleId: role.id, permissionId: perm.id } });
    if (!existing) {
      await bindingRepo.insert({ roleId: role.id, permissionId: perm.id, createdAt: NOW });
    }
    bindings++;
  }

  return { roles: ROLES.length, permissions: PERMISSIONS.length, bindings };
}
