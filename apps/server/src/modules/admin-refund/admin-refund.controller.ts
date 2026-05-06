import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminRefundItemVo, AdminRefundsListVo, AdminRefundsQueryDto } from './admin-refund.dto';
import { AdminRefundService } from './admin-refund.service';

@ApiTags('admin-refund')
@Controller('admin/refunds')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminRefundController {
  constructor(private readonly service: AdminRefundService) {}

  @Get()
  @RequirePermission('admin:refund:manage')
  @ApiOperation({ summary: '退款单列表' })
  @ApiOkResponse({ type: AdminRefundsListVo })
  async list(@Query() q: AdminRefundsQueryDto): Promise<AdminRefundsListVo> {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission('admin:refund:manage')
  @ApiOperation({ summary: '退款单详情' })
  @ApiOkResponse({ type: AdminRefundItemVo })
  async detail(@Param('id') id: string): Promise<AdminRefundItemVo> {
    return this.service.detail(id);
  }
}
