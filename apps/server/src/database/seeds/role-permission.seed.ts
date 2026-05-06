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
