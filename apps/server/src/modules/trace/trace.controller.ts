import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Ip,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Raw } from '../../common/decorators/raw-response.decorator';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  BatchListPageVo,
  CreateTraceBatchDto,
  CreateTraceRecordDto,
  type CustomerTraceInfoVo,
  GenerateQrcodesDto,
  type GenerateQrcodesVo,
  ListBatchesQueryDto,
  type QrLookupVo,
  type TraceBatchVo,
  type TraceRecordVo,
  UpdateTraceRecordDto,
} from './trace.dto';
import { TraceService } from './trace.service';

// ============= Admin =============

@ApiTags('admin-trace')
@Controller('admin/trace')
@UseGuards(AdminJwtGuard)
@ApiBearerAuth('Admin-Token')
export class TraceAdminController {
  constructor(private readonly service: TraceService) {}

  @Post('batches')
  @Idempotent({ scope: 'trace-batch:create', ttlSeconds: 60 })
  @Audit({ targetType: 'trace-batch' })
  @ApiOperation({ summary: '创建批次' })
  async createBatch(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateTraceBatchDto): Promise<TraceBatchVo> {
    return this.service.createBatch(p.principalId, dto);
  }

  @Get('batches')
  @ApiOperation({ summary: '批次列表' })
  async listBatches(@Query() query: ListBatchesQueryDto): Promise<BatchListPageVo> {
    return this.service.listBatches(query);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: '批次详情(含已生成 QR 数)' })
  async batchDetail(@Param('id') id: string): Promise<TraceBatchVo> {
    return this.service.getBatchById(id);
  }

  @Post('batches/:id/qrcodes/generate')
  @Idempotent({ scope: 'trace-qr:generate', ttlSeconds: 60 })
  @Audit({ targetType: 'trace-qr' })
  @ApiOperation({ summary: '异步生成 N 个二维码(写 trace_qr,PNG 由下载时按需生成)' })
  async generateQrcodes(@Param('id') id: string, @Body() dto: GenerateQrcodesDto): Promise<GenerateQrcodesVo> {
    return this.service.generateQrcodes(id, dto.count);
  }

  @Get('batches/:id/qrcodes/generate/:taskId')
  @ApiOperation({ summary: '生成任务进度' })
  async qrGenStatus(@Param('taskId') taskId: string): Promise<GenerateQrcodesVo> {
    return this.service.getQrTask(taskId);
  }

  @Get('batches/:id/qrcodes/export.csv')
  @Raw()
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: '导出该批次 CSV 索引(含 qr_code/short_sig/url)' })
  async exportCsv(@Param('id') id: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    const baseUrl = process.env.TRACE_QR_BASE_URL ?? `${req.protocol}://${req.get('host')}/api/v1`;
    const { filename, csv } = await this.service.exportBatchCsv(id, baseUrl);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('qrcodes/lookup')
  @ApiOperation({ summary: '扫码枪定位:输入 qr_code 返回 QR 详情' })
  async lookupQr(@Query('code') code: string): Promise<QrLookupVo> {
    if (!code) throw new NotFoundException({ code: 'DATA_NOT_FOUND' });
    return this.service.lookupQrByCode(code);
  }

  @Get('qrcodes/:qrId')
  @ApiOperation({ summary: 'QR 详情 + 关联节点' })
  async qrDetail(@Param('qrId') qrId: string): Promise<QrLookupVo & { records: TraceRecordVo[] }> {
    return this.service.getQrById(qrId);
  }

  @Post('records')
  @Idempotent({ scope: 'trace-record:create', ttlSeconds: 30 })
  @Audit({ targetType: 'trace-record' })
  @ApiOperation({ summary: '录入溯源节点(批次维度或单 QR 维度)' })
  async createRecord(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreateTraceRecordDto): Promise<TraceRecordVo> {
    return this.service.createRecord(p.principalId, null, dto);
  }

  @Put('records/:id')
  @Audit({ targetType: 'trace-record' })
  @ApiOperation({ summary: '编辑溯源节点' })
  async updateRecord(
    @CurrentUser() p: CurrentPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateTraceRecordDto,
  ): Promise<TraceRecordVo> {
    return this.service.updateRecord(p.principalId, id, dto);
  }

  @Delete('records/:id')
  @Audit({ targetType: 'trace-record' })
  @ApiOperation({ summary: '删除溯源节点' })
  async deleteRecord(@Param('id') id: string): Promise<{ ok: true }> {
    await this.service.deleteRecord(id);
    return { ok: true };
  }

  @Get('batches/:id/stats')
  @ApiOperation({ summary: '批次扫码统计' })
  async batchStats(@Param('id') id: string): Promise<{ batchNo: string; totalScans: number; uniqueQrScanned: number }> {
    return this.service.statsForBatch(id);
  }
}

// ============= Customer scan =============

@ApiTags('customer-trace')
@Controller('c/trace')
@Public()
export class TraceCustomerController {
  constructor(private readonly service: TraceService) {}

  @Get('info')
  @ApiOperation({ summary: '扫一扫:验签 + 返回商品/批次/节点信息' })
  async info(
    @Query('code') code: string,
    @Query('sig') sig: string,
    @Req() req: Request,
    @Ip() ip: string,
  ): Promise<CustomerTraceInfoVo> {
    if (!code || !sig) throw new NotFoundException({ code: 'DATA_NOT_FOUND' });
    const ua = req.headers['user-agent'] ?? null;
    const customerId = (req as Request & { principal?: CurrentPrincipal }).principal?.principalId ?? null;
    return this.service.customerScan(code, sig, customerId, ip ?? null, typeof ua === 'string' ? ua : null);
  }
}
