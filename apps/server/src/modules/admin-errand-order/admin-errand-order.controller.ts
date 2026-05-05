import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  AdminErrandOrderDetailVo,
  AdminErrandOrderListPageVo,
  AdminErrandStatsVo,
  AdminListErrandOrdersQueryDto,
} from './admin-errand-order.dto';
import { AdminErrandOrderService } from './admin-errand-order.service';

@ApiTags('admin-errand-order')
@Controller('admin/errand-orders')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminErrandOrderController {
  constructor(private readonly service: AdminErrandOrderService) {}

  @Get('stats')
  @RequirePermission('admin:errand-orders:view')
  @ApiOperation({ summary: '跑腿订单统计仪表盘(各状态计数 + 总金额)' })
  @ApiOkResponse({ type: AdminErrandStatsVo })
  async stats(): Promise<AdminErrandStatsVo> {
    return this.service.stats();
  }

  @Get()
  @RequirePermission('admin:errand-orders:view')
  @ApiOperation({ summary: '跑腿订单列表(平台维度)' })
  @ApiOkResponse({ type: AdminErrandOrderListPageVo })
  async list(@Query() q: AdminListErrandOrdersQueryDto): Promise<AdminErrandOrderListPageVo> {
    return this.service.list(q);
  }

  @Get(':orderId')
  @RequirePermission('admin:errand-orders:view')
  @ApiOperation({ summary: '跑腿订单详情' })
  @ApiOkResponse({ type: AdminErrandOrderDetailVo })
  async detail(@Param('orderId') orderId: string): Promise<AdminErrandOrderDetailVo> {
    return this.service.detail(orderId);
  }
}
