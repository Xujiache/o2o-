import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { SystemConfigListVo, SystemConfigMutationVo, UpdateSystemConfigDto } from './admin-system-config.dto';
import { AdminSystemConfigService } from './admin-system-config.service';

@ApiTags('admin-system-config')
@Controller('admin/system-config')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminSystemConfigController {
  constructor(private readonly service: AdminSystemConfigService) {}

  @Get()
  @RequirePermission('admin:menu:system-config')
  @ApiOperation({ summary: '系统参数列表(seed 行)' })
  @ApiOkResponse({ type: SystemConfigListVo })
  async list(): Promise<SystemConfigListVo> {
    return this.service.list();
  }

  @Patch(':key')
  @RequirePermission('admin:system-config:manage')
  @Idempotent({ scope: 'admin-system-config:patch', ttlSeconds: 30 })
  @Audit({ targetType: 'sys-config' })
  @ApiOperation({ summary: '更新 value(只允许编辑 seed 已存在的 key,新增 key 报 SYSTEM_CONFIG_KEY_UNKNOWN)' })
  @ApiOkResponse({ type: SystemConfigMutationVo })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<SystemConfigMutationVo> {
    return this.service.update(key, dto.value, principal.principalId);
  }
}
