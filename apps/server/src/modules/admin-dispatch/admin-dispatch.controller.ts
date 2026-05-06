import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminDispatchDetailVo, AdminDispatchListVo, AdminDispatchQueryDto } from './admin-dispatch.dto';
import { AdminDispatchService } from './admin-dispatch.service';

@ApiTags('admin-dispatch')
@Controller('admin/dispatch-tasks')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminDispatchController {
  constructor(private readonly service: AdminDispatchService) {}

  @Get()
  @RequirePermission('admin:dispatch:view')
  @ApiOperation({ summary: '平台派单流水列表' })
  @ApiOkResponse({ type: AdminDispatchListVo })
  async list(@Query() q: AdminDispatchQueryDto): Promise<AdminDispatchListVo> {
    return this.service.list(q);
  }

  @Get(':id')
  @RequirePermission('admin:dispatch:view')
  @ApiOperation({ summary: '派单流水详情' })
  @ApiOkResponse({ type: AdminDispatchDetailVo })
  async detail(@Param('id') id: string): Promise<AdminDispatchDetailVo> {
    return this.service.detail(id);
  }
}
