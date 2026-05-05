import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  AdminFoodOrderDetailVo,
  AdminFoodOrderListPageVo,
  AdminListFoodOrdersQueryDto,
  AdminTimelineStatsVo,
} from './admin-food-order.dto';
import { AdminFoodOrderService } from './admin-food-order.service';

@ApiTags('admin-food-order')
@Controller('admin/food-orders')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminFoodOrderController {
  constructor(private readonly service: AdminFoodOrderService) {}

  @Get('timeline-statistics')
  @RequirePermission('admin:food-orders:view')
  @ApiOperation({ summary: '超时统计仪表盘(15min 未支付/10min 商家未接/配送中/今日完成/今日取消)' })
  @ApiOkResponse({ type: AdminTimelineStatsVo })
  async stats(): Promise<AdminTimelineStatsVo> {
    return this.service.timelineStatistics();
  }

  @Get()
  @RequirePermission('admin:food-orders:view')
  @ApiOperation({ summary: '外卖订单列表(平台维度,可按 status/cityCode/customerId/storeId/payChannel 筛选)' })
  @ApiOkResponse({ type: AdminFoodOrderListPageVo })
  async list(@Query() query: AdminListFoodOrdersQueryDto): Promise<AdminFoodOrderListPageVo> {
    return this.service.list(query);
  }

  @Get(':orderId')
  @RequirePermission('admin:food-orders:view')
  @ApiOperation({ summary: '外卖订单详情(含完整 timeline + payment 信息)' })
  @ApiOkResponse({ type: AdminFoodOrderDetailVo })
  async detail(@Param('orderId') orderId: string): Promise<AdminFoodOrderDetailVo> {
    return this.service.detail(orderId);
  }
}
