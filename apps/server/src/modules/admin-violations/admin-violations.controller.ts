import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AdminViolationsListVo, AdminViolationsQueryDto } from './admin-violations.dto';
import { AdminViolationsService } from './admin-violations.service';

@ApiTags('admin-violations')
@Controller('admin/violations')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminViolationsController {
  constructor(private readonly service: AdminViolationsService) {}

  @Get()
  @RequirePermission('admin:violations:view')
  @ApiOperation({ summary: '平台违规记录列表' })
  @ApiOkResponse({ type: AdminViolationsListVo })
  async list(@Query() q: AdminViolationsQueryDto): Promise<AdminViolationsListVo> {
    return this.service.list(q);
  }
}
