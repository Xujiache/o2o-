import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  AvailableCouponsListVo,
  AvailableCouponsQueryDto,
  ClaimCouponVo,
  MyCouponsListVo,
  MyCouponsQueryDto,
} from './coupon-customer.dto';
import { CouponCustomerService } from './coupon-customer.service';

@ApiTags('coupons')
@Controller('c/coupons')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class CouponCustomerController {
  constructor(private readonly service: CouponCustomerService) {}

  @Get('available')
  @ApiOperation({ summary: '可领取的优惠券列表' })
  @ApiOkResponse({ type: AvailableCouponsListVo })
  async listAvailable(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: AvailableCouponsQueryDto,
  ): Promise<AvailableCouponsListVo> {
    return this.service.listAvailable(principal.principalId, query);
  }

  @Post('claim/:couponRuleId')
  @Idempotent({ scope: 'c-coupon:claim', ttlSeconds: 60 })
  @ApiOperation({ summary: '领取优惠券' })
  @ApiOkResponse({ type: ClaimCouponVo })
  async claim(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('couponRuleId') couponRuleId: string,
  ): Promise<ClaimCouponVo> {
    return this.service.claim(principal.principalId, couponRuleId);
  }

  @Get('my')
  @ApiOperation({ summary: '我的优惠券' })
  @ApiOkResponse({ type: MyCouponsListVo })
  async listMy(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: MyCouponsQueryDto,
  ): Promise<MyCouponsListVo> {
    return this.service.listMy(principal.principalId, query);
  }
}
