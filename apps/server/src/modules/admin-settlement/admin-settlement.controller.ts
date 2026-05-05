import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminSettlementListItemVo, AdminSettlementListVo, AdminSettlementQueryDto } from './admin-settlement.dto';
import { AdminSettlementService } from './admin-settlement.service';

@ApiTags('admin-settlement')
@Controller('admin/settlements')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminSettlementController {
  constructor(private readonly service: AdminSettlementService) {}

  @Get()
  @RequirePermission('admin:settlements:view')
  @ApiOperation({ summary: '平台结算单列表' })
  @ApiOkResponse({ type: AdminSettlementListVo })
  async list(@Query() q: AdminSettlementQueryDto): Promise<AdminSettlementListVo> {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission('admin:settlements:view')
  @ApiOperation({ summary: '平台结算单详情' })
  @ApiOkResponse({ type: AdminSettlementListItemVo })
  async detail(@Param('id') id: string): Promise<AdminSettlementListItemVo> {
    return this.service.detail(id);
  }
}
