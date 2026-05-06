import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { DashboardOverviewQueryDto, DashboardOverviewVo } from './dashboard.dto';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  @RequirePermission('admin:dashboard:view')
  @ApiOperation({ summary: '数据大屏 — 总览' })
  @ApiOkResponse({ type: DashboardOverviewVo })
  async overview(@Query() q: DashboardOverviewQueryDto): Promise<DashboardOverviewVo> {
    return this.service.overview(q);
  }
}
