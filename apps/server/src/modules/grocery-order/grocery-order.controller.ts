import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CancelGroceryOrderDto,
  type CancelGroceryOrderVo,
  type GroceryOrderDetailVo,
  type GroceryOrderListPageVo,
  ListGroceryOrdersQueryDto,
  PreviewGroceryOrderDto,
  type PreviewGroceryOrderVo,
  SubmitGroceryOrderDto,
  type SubmitGroceryOrderVo,
} from './grocery-order.dto';
import { GroceryOrderService } from './grocery-order.service';

@ApiTags('customer-grocery-order')
@Controller('c/grocery/orders')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class GroceryOrderCustomerController {
  constructor(private readonly service: GroceryOrderService) {}

  @Post('preview')
  @Idempotent({ scope: 'grocery-order:preview', ttlSeconds: 60 })
  @ApiOperation({ summary: '生鲜订单试算' })
  async preview(
    @CurrentUser() p: CurrentPrincipal,
    @Body() dto: PreviewGroceryOrderDto,
  ): Promise<PreviewGroceryOrderVo> {
    return this.service.preview(p.principalId, dto);
  }

  @Post()
  @Idempotent({ scope: 'grocery-order:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '提交订单(事务:锁库存+占时段+写订单)' })
  async submit(@CurrentUser() p: CurrentPrincipal, @Body() dto: SubmitGroceryOrderDto): Promise<SubmitGroceryOrderVo> {
    return this.service.submit(p.principalId, dto);
  }

  @Get()
  @ApiOperation({ summary: '我的生鲜订单列表' })
  async list(
    @CurrentUser() p: CurrentPrincipal,
    @Query() query: ListGroceryOrdersQueryDto,
  ): Promise<GroceryOrderListPageVo> {
    return this.service.list(p.principalId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '生鲜订单详情' })
  async detail(@CurrentUser() p: CurrentPrincipal, @Param('id') id: string): Promise<GroceryOrderDetailVo> {
    return this.service.detail(p.principalId, id);
  }

  @Post(':id/cancel')
  @Idempotent({ scope: 'grocery-order:cancel', ttlSeconds: 60 })
  @Audit({ targetType: 'grocery-order' })
  @ApiOperation({ summary: '取消订单(仅 WAIT_PAY)' })
  async cancel(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: CancelGroceryOrderDto,
  ): Promise<CancelGroceryOrderVo> {
    return this.service.cancel(p.principalId, id, dto);
  }
}
