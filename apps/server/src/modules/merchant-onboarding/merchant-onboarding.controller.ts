import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { OnboardingStatusVo, SubmitApplicationDto, SubmitApplicationVo } from './merchant-onboarding.dto';
import { MerchantOnboardingService } from './merchant-onboarding.service';

@ApiTags('merchant-onboarding')
@Controller('m/onboarding')
export class MerchantOnboardingController {
  constructor(private readonly service: MerchantOnboardingService) {}

  @Post('applications')
  @Public()
  @Idempotent({ scope: 'merchant-onboarding:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-application' })
  @ApiOperation({ summary: '商家提交入驻申请(无 token,凭 mobile + smsCode)' })
  @ApiOkResponse({ type: SubmitApplicationVo })
  async submit(@Body() dto: SubmitApplicationDto): Promise<SubmitApplicationVo> {
    return this.service.submit(dto);
  }

  @Get('status')
  @UseGuards(MerchantJwtGuard, PermissionGuard)
  @RequirePermission('merchant:store:own')
  @ApiBearerAuth('Merchant-Token')
  @ApiOperation({ summary: '查询入驻审核状态' })
  @ApiOkResponse({ type: OnboardingStatusVo })
  async getStatus(@CurrentUser() principal: CurrentPrincipal): Promise<OnboardingStatusVo> {
    const r = await this.service.getStatus(principal.principalId);
    return r as unknown as OnboardingStatusVo;
  }
}
