import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminMerchantStatisticsListVo, AdminMerchantStatisticsQueryDto } from './admin-merchant-statistics.dto';
import { AdminMerchantStatisticsService } from './admin-merchant-statistics.service';

@ApiTags('admin-merchant-statistics')
@Controller('admin/merchant-statistics')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminMerchantStatisticsController {
  constructor(private readonly service: AdminMerchantStatisticsService) {}

  @Get()
  @RequirePermission('admin:settlements:view')
  @ApiOperation({ summary: '平台商家经营快照(日级)' })
  @ApiOkResponse({ type: AdminMerchantStatisticsListVo })
  async list(@Query() q: AdminMerchantStatisticsQueryDto): Promise<AdminMerchantStatisticsListVo> {
    return this.service.list(q);
  }
}
