import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  ArchiveMutationVo,
  ArchiveVo,
  BatchGenerationResultVo,
  BindArchiveDto,
  BindResultVo,
  CreateArchiveDto,
  GenerateBatchDto,
  ListArchivesQueryDto,
  ListArchivesVo,
  ListBatchCodesVo,
  ListBatchesQueryDto,
  ListBatchesVo,
  UpdateArchiveDto,
} from './traceability.dto';
import { TraceabilityService } from './traceability.service';

@ApiTags('admin-traceability')
@Controller('admin/traceability')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminTraceabilityController {
  constructor(private readonly service: TraceabilityService) {}

  /** ===== 档案 ===== */
  @Get('archives')
  @RequirePermission('admin:trace:archive:read')
  @ApiOperation({ summary: '档案列表' })
  @ApiOkResponse({ type: ListArchivesVo })
  async listArchives(@Query() query: ListArchivesQueryDto): Promise<ListArchivesVo> {
    return this.service.listArchives(query);
  }

  @Post('archives')
  @RequirePermission('admin:trace:archive:write')
  @Idempotent({ scope: 'admin-trace-archive:create', ttlSeconds: 60 })
  @Audit({ targetType: 'trace-archive' })
  @ApiOperation({ summary: '新增档案' })
  @ApiOkResponse({ type: ArchiveMutationVo })
  async createArchive(@Body() dto: CreateArchiveDto): Promise<ArchiveMutationVo> {
    return this.service.createArchive(dto);
  }

  @Patch('archives/:archiveId')
  @RequirePermission('admin:trace:archive:write')
  @Idempotent({ scope: 'admin-trace-archive:update', ttlSeconds: 30 })
  @Audit({ targetType: 'trace-archive' })
  @ApiOperation({ summary: '更新档案' })
  @ApiOkResponse({ type: ArchiveMutationVo })
  async updateArchive(
    @Param('archiveId') archiveId: string,
    @Body() dto: UpdateArchiveDto,
  ): Promise<ArchiveMutationVo> {
    return this.service.updateArchive(archiveId, dto);
  }

  @Get('archives/:archiveId')
  @RequirePermission('admin:trace:archive:read')
  @ApiOperation({ summary: '档案详情' })
  @ApiOkResponse({ type: ArchiveVo })
  async detailArchive(@Param('archiveId') archiveId: string): Promise<ArchiveVo> {
    return this.service.detailArchive(archiveId);
  }

  /** ===== 二维码批次 ===== */
  @Post('qrcodes/batches')
  @RequirePermission('admin:trace:qrcode:generate')
  @Idempotent({ scope: 'admin-trace-batch:create', ttlSeconds: 60 })
  @Audit({ targetType: 'qrcode-batch' })
  @ApiOperation({ summary: '批量生成 blank 二维码(≤1000/批)' })
  @ApiOkResponse({ type: BatchGenerationResultVo })
  async generateBatch(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: GenerateBatchDto,
  ): Promise<BatchGenerationResultVo> {
    return this.service.generateBatch(dto.name, dto.count, principal.principalId);
  }

  @Get('qrcodes/batches')
  @RequirePermission('admin:trace:qrcode:generate')
  @ApiOperation({ summary: '批次列表' })
  @ApiOkResponse({ type: ListBatchesVo })
  async listBatches(@Query() query: ListBatchesQueryDto): Promise<ListBatchesVo> {
    return this.service.listBatches(query);
  }

  @Get('qrcodes/batches/:batchId/codes')
  @RequirePermission('admin:trace:qrcode:export')
  @ApiOperation({ summary: '批次内所有 code(可前端表格导出 CSV)' })
  @ApiOkResponse({ type: ListBatchCodesVo })
  async listBatchCodes(@Param('batchId') batchId: string): Promise<ListBatchCodesVo> {
    return this.service.listBatchCodes(batchId);
  }

  /** ===== 扫码绑定档案 ===== */
  @Post('qrcodes/:code/bind')
  @RequirePermission('admin:trace:qrcode:bind')
  @Idempotent({ scope: 'admin-trace-qrcode:bind', ttlSeconds: 10 })
  @Audit({ targetType: 'qrcode' })
  @ApiOperation({ summary: '扫码绑定档案(blank → bound)' })
  @ApiOkResponse({ type: BindResultVo })
  async bind(@Param('code') code: string, @Body() dto: BindArchiveDto): Promise<BindResultVo> {
    return this.service.bindCodeToArchive(code, dto.archiveId);
  }
}
