import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { CreateExportDto, ExportTaskVo } from './export.dto';
import { ExportService } from './export.service';

@ApiTags('export')
@Controller('admin/exports')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class ExportController {
  constructor(private readonly service: ExportService) {}

  @Post()
  @RequirePermission('admin:export:manage')
  @Idempotent({ scope: 'admin-export:create', ttlSeconds: 30 })
  @Audit({ targetType: 'export-task' })
  @ApiOperation({ summary: '创建导出任务' })
  @ApiOkResponse({ type: ExportTaskVo })
  async create(@Body() dto: CreateExportDto, @CurrentUser() principal: CurrentPrincipal): Promise<ExportTaskVo> {
    return this.service.enqueue(dto, principal.principalId);
  }

  @Get(':id')
  @RequirePermission('admin:export:manage')
  @ApiOperation({ summary: '导出任务详情/下载' })
  @ApiOkResponse({ type: ExportTaskVo })
  async detail(@Param('id') id: string): Promise<ExportTaskVo> {
    return this.service.detail(id);
  }
}
