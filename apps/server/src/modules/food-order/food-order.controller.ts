import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CancelOrderDto,
  CancelOrderVo,
  FoodOrderDetailVo,
  FoodOrderListPageVo,
  ListOrdersQueryDto,
  PreviewOrderDto,
  PreviewVo,
  ReviewOrderDto,
  ReviewOrderVo,
  SubmitOrderDto,
  SubmitOrderVo,
} from './food-order.dto';
import { FoodOrderService } from './food-order.service';

@ApiTags('food-order')
@Controller('c/food/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class FoodOrderController {
  constructor(private readonly service: FoodOrderService) {}

  @Post('preview')
  @Idempotent({ scope: 'food-order:preview', ttlSeconds: 60 })
  @ApiOperation({ summary: '订单试算(写 order_price_snapshot 5min TTL)' })
  @ApiOkResponse({ type: PreviewVo })
  async preview(@CurrentUser() principal: CurrentPrincipal, @Body() dto: PreviewOrderDto): Promise<PreviewVo> {
    return this.service.preview(principal.principalId, dto);
  }

  @Post()
  @Idempotent({ scope: 'food-order:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '提交订单(事务:锁库存 + 写 food_order WAIT_PAY + 发 FoodOrderCreated)' })
  @ApiOkResponse({ type: SubmitOrderVo })
  async submit(@CurrentUser() principal: CurrentPrincipal, @Body() dto: SubmitOrderDto): Promise<SubmitOrderVo> {
    return this.service.submit(principal.principalId, dto);
  }

  @Get()
  @ApiOperation({ summary: '订单列表(本人,可按 status 筛选)' })
  @ApiOkResponse({ type: FoodOrderListPageVo })
  async list(
    @CurrentUser() principal: CurrentPrincipal,
    @Query() query: ListOrdersQueryDto,
  ): Promise<FoodOrderListPageVo> {
    return this.service.list(principal.principalId, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: '订单详情(含 timeline + payment 简化字段 + actions)' })
  @ApiOkResponse({ type: FoodOrderDetailVo })
  async detail(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('orderId') orderId: string,
  ): Promise<FoodOrderDetailVo> {
    return this.service.detail(principal.principalId, orderId);
  }

  @Post(':orderId/cancel')
  @Idempotent({ scope: 'food-order:cancel', ttlSeconds: 60 })
  @Audit({ targetType: 'food-order' })
  @ApiOperation({ summary: '取消订单(仅 WAIT_PAY 用户可主动取消;事务释放 stock_lock)' })
  @ApiOkResponse({ type: CancelOrderVo })
  async cancel(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ): Promise<CancelOrderVo> {
    return this.service.cancel(principal.principalId, orderId, dto);
  }

  @Post(':orderId/reviews')
  @Idempotent({ scope: 'food-order:review', ttlSeconds: 60 })
  @Audit({ targetType: 'order-review' })
  @ApiOperation({ summary: '提交订单评价(限 COMPLETED 后 30 天 + 1 单 1 主评)' })
  @ApiOkResponse({ type: ReviewOrderVo })
  async review(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('orderId') orderId: string,
    @Body() dto: ReviewOrderDto,
  ): Promise<ReviewOrderVo> {
    return this.service.review(principal.principalId, orderId, dto);
  }
}
