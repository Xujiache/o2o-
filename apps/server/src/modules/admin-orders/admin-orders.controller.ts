import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminOrderTimelineVo } from './admin-orders.dto';
import { AdminOrdersService } from './admin-orders.service';

@ApiTags('admin-orders')
@Controller('admin/orders')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminOrdersController {
  constructor(private readonly service: AdminOrdersService) {}

  @Get(':bizType/:orderId/timeline')
  @RequirePermission('admin:order:timeline:view')
  @Audit({ targetType: 'order-timeline-read' })
  @ApiOperation({ summary: '平台订单时间线(含 operator/dispatch/payment 日志)' })
  @ApiOkResponse({ type: AdminOrderTimelineVo })
  async timeline(
    @Param('bizType') bizType: 'FOOD' | 'ERRAND',
    @Param('orderId') orderId: string,
  ): Promise<AdminOrderTimelineVo> {
    return this.service.getTimeline(bizType, orderId);
  }
}
