import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { CouponPublishVo, CouponsListVo, CouponsQueryDto, CreateCouponDto } from './marketing.dto';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@Controller('admin/marketing')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  @Post('coupons')
  @RequirePermission('admin:marketing:manage')
  @Idempotent({ scope: 'admin-marketing:coupon', ttlSeconds: 60 })
  @Audit({ targetType: 'coupon-rule' })
  @ApiOperation({ summary: '发布优惠券' })
  @ApiOkResponse({ type: CouponPublishVo })
  async createCoupon(
    @Body() dto: CreateCouponDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<CouponPublishVo> {
    return this.service.publishCoupon(dto, principal.principalId);
  }

  @Get('coupons')
  @RequirePermission('admin:marketing:manage')
  @ApiOperation({ summary: '优惠券列表' })
  @ApiOkResponse({ type: CouponsListVo })
  async listCoupons(@Query() q: CouponsQueryDto): Promise<CouponsListVo> {
    return this.service.list(q);
  }
}
