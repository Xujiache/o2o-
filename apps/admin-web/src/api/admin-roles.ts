import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const RoleEndpoints = {
  Roles: '/api/v1/admin/roles',
  Permissions: '/api/v1/admin/permissions',
  RolePermissions: (id: string): string => `/api/v1/admin/roles/${id}/permissions`,
} as const;

export interface RoleItemVo {
  roleId: string;
  code: string;
  name: string;
  scope: string;
  enabled: boolean;
  permissionCodes: string[];
}

export interface RoleListVo {
  list: RoleItemVo[];
}

export interface PermissionItemVo {
  code: string;
  name: string;
  type: 'menu' | 'button' | 'data';
  scope: string;
  parentCode?: string | null;
}

export interface PermissionGroupVo {
  group: string;
  permissions: PermissionItemVo[];
}

export interface PermissionTreeVo {
  groups: PermissionGroupVo[];
}

export interface UpdateRolePermissionsVo {
  roleId: string;
  appliedCodes: string[];
  affectedAdminUsers: number;
  updatedAt: string;
}

export function listRoles(): Promise<ApiResponse<RoleListVo>> {
  return request<RoleListVo>({ url: RoleEndpoints.Roles, method: 'GET' });
}

export function listPermissions(): Promise<ApiResponse<PermissionTreeVo>> {
  return request<PermissionTreeVo>({ url: RoleEndpoints.Permissions, method: 'GET' });
}

export function updateRolePermissions(
  roleId: string,
  permissionCodes: string[],
): Promise<ApiResponse<UpdateRolePermissionsVo>> {
  return request<UpdateRolePermissionsVo>({
    url: RoleEndpoints.RolePermissions(roleId),
    method: 'PUT' as never,
    data: { permissionCodes } as never,
  });
}
