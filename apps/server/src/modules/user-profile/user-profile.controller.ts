import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ChangeCustomerMobileDto, CustomerProfileVo, UpdateCustomerProfileDto } from './user-profile.dto';
import { UserProfileService } from './user-profile.service';

@ApiTags('customer-profile')
@Controller('c/profile')
@UseGuards(CustomerJwtGuard, PermissionGuard)
@ApiBearerAuth('Customer-Token')
export class UserProfileController {
  constructor(private readonly service: UserProfileService) {}

  @Get()
  @RequirePermission('customer:self')
  @ApiOperation({ summary: '获取当前用户资料' })
  @ApiOkResponse({ type: CustomerProfileVo })
  async getCurrent(@CurrentUser() principal: CurrentPrincipal): Promise<CustomerProfileVo> {
    return this.service.getCurrent(principal.principalId);
  }

  @Patch()
  @RequirePermission('customer:self')
  @Idempotent({ scope: 'customer-profile:update', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-profile' })
  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiOkResponse({ type: CustomerProfileVo })
  async updateCurrent(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: UpdateCustomerProfileDto,
  ): Promise<CustomerProfileVo> {
    return this.service.updateCurrent(principal.principalId, dto);
  }

  @Post('mobile')
  @RequirePermission('customer:self')
  @Idempotent({ scope: 'customer-profile:mobile', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-profile' })
  @ApiOperation({ summary: '修改当前用户手机号' })
  @ApiOkResponse({ type: CustomerProfileVo })
  async changeMobile(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: ChangeCustomerMobileDto,
  ): Promise<CustomerProfileVo> {
    return this.service.changeMobile(principal.principalId, dto);
  }
}
