import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';
import { ExportService } from '../export/export.service';

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
  constructor(
    private readonly service: AdminErrandOrderService,
    private readonly exportService: ExportService,
  ) {}

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

  @Get('export')
  @RequirePermission('admin:export:manage')
  @ApiOperation({ summary: '导出跑腿订单(异步)' })
  async exportOrders(
    @Query() q: AdminListErrandOrdersQueryDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<{ exportTaskId: string; status: string }> {
    const r = await this.exportService.enqueue(
      { exportType: 'errand-orders', queryParams: q as unknown as Record<string, unknown> },
      principal.principalId,
    );
    return { exportTaskId: r.exportTaskId, status: r.status };
  }

  @Get(':orderId')
  @RequirePermission('admin:errand-orders:view')
  @ApiOperation({ summary: '跑腿订单详情' })
  @ApiOkResponse({ type: AdminErrandOrderDetailVo })
  async detail(@Param('orderId') orderId: string): Promise<AdminErrandOrderDetailVo> {
    return this.service.detail(orderId);
  }
}
