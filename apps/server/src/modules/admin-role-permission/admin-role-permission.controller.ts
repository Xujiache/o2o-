import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  PermissionTreeVo,
  RoleListVo,
  UpdateRolePermissionsDto,
  UpdateRolePermissionsVo,
} from './admin-role-permission.dto';
import { AdminRolePermissionService } from './admin-role-permission.service';

@ApiTags('admin-role-permission')
@Controller('admin')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminRolePermissionController {
  constructor(private readonly service: AdminRolePermissionService) {}

  @Get('roles')
  @RequirePermission('admin:menu:roles-permissions')
  @ApiOperation({ summary: '角色列表(含 permissionCodes)' })
  @ApiOkResponse({ type: RoleListVo })
  async listRoles(): Promise<RoleListVo> {
    return this.service.listRoles();
  }

  @Get('permissions')
  @RequirePermission('admin:menu:roles-permissions')
  @ApiOperation({ summary: '权限点 seed 树(分组 customer/merchant/rider/admin/public)' })
  @ApiOkResponse({ type: PermissionTreeVo })
  async listPermissions(): Promise<PermissionTreeVo> {
    return this.service.listPermissionTree();
  }

  @Put('roles/:id/permissions')
  @RequirePermission('admin:roles:manage')
  @Idempotent({ scope: 'admin-role-permission:put', ttlSeconds: 30 })
  @Audit({ targetType: 'sys-role-permission' })
  @ApiOperation({ summary: '覆盖式更新角色权限点(发 RoleChanged + 触发该角色 admin 强制重登)' })
  @ApiOkResponse({ type: UpdateRolePermissionsVo })
  async updateRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<UpdateRolePermissionsVo> {
    return this.service.updateRolePermissions(id, dto.permissionCodes, principal.principalId);
  }
}
