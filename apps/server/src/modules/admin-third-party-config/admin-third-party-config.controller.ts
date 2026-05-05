import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  ThirdPartyConfigItemVo,
  ThirdPartyConfigListVo,
  ThirdPartyConfigMutationVo,
  UpdateThirdPartyConfigDto,
} from './admin-third-party-config.dto';
import { AdminThirdPartyConfigService } from './admin-third-party-config.service';

@ApiTags('admin-third-party-config')
@Controller('admin/integrations')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminThirdPartyConfigController {
  constructor(private readonly service: AdminThirdPartyConfigService) {}

  @Get()
  @RequirePermission('admin:menu:integrations')
  @ApiOperation({ summary: '第三方配置列表(secret 脱敏)' })
  @ApiOkResponse({ type: ThirdPartyConfigListVo })
  async list(): Promise<ThirdPartyConfigListVo> {
    return this.service.list();
  }

  @Get(':provider')
  @RequirePermission('admin:menu:integrations')
  @ApiOperation({ summary: '单个 provider 详情(secret 脱敏)' })
  @ApiOkResponse({ type: ThirdPartyConfigItemVo })
  async detail(@Param('provider') provider: string): Promise<ThirdPartyConfigItemVo> {
    return this.service.detail(provider);
  }

  @Patch(':provider')
  @RequirePermission('admin:third-party:manage')
  @Idempotent({ scope: 'admin-third-party:patch', ttlSeconds: 30 })
  @Audit({ targetType: 'third-party-config' })
  @ApiOperation({ summary: '更新第三方配置(secret 加密存储)+ 发布 ThirdPartyConfigChanged' })
  @ApiOkResponse({ type: ThirdPartyConfigMutationVo })
  async update(
    @Param('provider') provider: string,
    @Body() dto: UpdateThirdPartyConfigDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ThirdPartyConfigMutationVo> {
    return this.service.update(provider, dto, principal.principalId);
  }
}
