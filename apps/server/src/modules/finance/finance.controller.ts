import { Body, Controller, Get, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { PatchRateRuleDto, RateRulePatchVo, RateRulesListVo, RateRulesQueryDto } from './finance.dto';
import { FinanceService } from './finance.service';

@ApiTags('finance')
@Controller('admin/rate-rules')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Patch()
  @RequirePermission('admin:rate:rules:manage')
  @Idempotent({ scope: 'admin-finance:rate', ttlSeconds: 60 })
  @Audit({ targetType: 'rate-rule' })
  @ApiOperation({ summary: '费率配置(写新规则,旧规则失效)' })
  @ApiOkResponse({ type: RateRulePatchVo })
  async patchRule(@Body() dto: PatchRateRuleDto, @CurrentUser() principal: CurrentPrincipal): Promise<RateRulePatchVo> {
    return this.service.patchRule(dto, principal.principalId);
  }

  @Get()
  @RequirePermission('admin:rate:rules:manage')
  @ApiOperation({ summary: '费率列表' })
  @ApiOkResponse({ type: RateRulesListVo })
  async list(@Query() q: RateRulesQueryDto): Promise<RateRulesListVo> {
    return this.service.list(q);
  }
}
