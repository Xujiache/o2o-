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
    // SUPER_ADMIN 全量已通过 ...PERMISSIONS.map 覆盖,无需重复
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
