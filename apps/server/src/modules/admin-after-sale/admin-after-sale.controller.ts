import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminAfterSaleDetailVo, AdminAfterSaleListVo, AdminAfterSaleQueryDto } from './admin-after-sale.dto';
import { AdminAfterSaleService } from './admin-after-sale.service';

@ApiTags('admin-after-sale')
@Controller('admin/after-sales')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminAfterSaleController {
  constructor(private readonly service: AdminAfterSaleService) {}

  @Get()
  @RequirePermission('admin:after-sales:view')
  @ApiOperation({ summary: '平台售后单列表' })
  @ApiOkResponse({ type: AdminAfterSaleListVo })
  async list(@Query() q: AdminAfterSaleQueryDto): Promise<AdminAfterSaleListVo> {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission('admin:after-sales:view')
  @ApiOperation({ summary: '平台售后单详情' })
  @ApiOkResponse({ type: AdminAfterSaleDetailVo })
  async detail(@Param('id') id: string): Promise<AdminAfterSaleDetailVo> {
    return this.service.detail(id);
  }
}
