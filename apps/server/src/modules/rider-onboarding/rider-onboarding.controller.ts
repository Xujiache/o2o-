import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { RiderOnboardingStatusVo, SubmitRiderApplicationDto, SubmitRiderApplicationVo } from './rider-onboarding.dto';
import { RiderOnboardingService } from './rider-onboarding.service';

@ApiTags('rider-onboarding')
@Controller('r/onboarding')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderOnboardingController {
  constructor(private readonly service: RiderOnboardingService) {}

  @Post('applications')
  @RequirePermission('rider:self')
  @Idempotent({ scope: 'rider-onboarding:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-application' })
  @ApiOperation({ summary: '骑手提交入驻申请(已登录,提交资质 + 车辆)' })
  @ApiOkResponse({ type: SubmitRiderApplicationVo })
  async submit(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: SubmitRiderApplicationDto,
  ): Promise<SubmitRiderApplicationVo> {
    return this.service.submit(principal.principalId, dto);
  }

  @Get('status')
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '查询入驻审核状态' })
  @ApiOkResponse({ type: RiderOnboardingStatusVo })
  async getStatus(@CurrentUser() principal: CurrentPrincipal): Promise<RiderOnboardingStatusVo> {
    return this.service.getStatus(principal.principalId);
  }
}
