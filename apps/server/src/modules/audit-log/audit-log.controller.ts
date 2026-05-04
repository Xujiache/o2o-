import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SysAuditLog } from '../../database/entities';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { AuditLogPageVo, AuditLogVo, QueryAuditLogDto } from './audit-log.dto';

@ApiTags('admin')
@ApiSecurity('Admin-Token')
@Controller('admin/audit-logs')
@UseGuards(AdminJwtGuard, PermissionGuard)
export class AuditLogController {
  constructor(@InjectRepository(SysAuditLog) private readonly repo: Repository<SysAuditLog>) {}

  @Get()
  @RequirePermission('admin:audit:logs:view')
  @ApiOperation({ summary: '查询审计日志(分页+多维筛选)' })
  @ApiOkResponse({ type: AuditLogPageVo })
  async list(@Query() dto: QueryAuditLogDto): Promise<AuditLogPageVo> {
    const where: FindOptionsWhere<SysAuditLog> = {};
    if (dto.operatorType) where.operatorType = dto.operatorType;
    if (dto.targetType) where.targetType = dto.targetType;
    if (dto.targetId) where.targetId = dto.targetId;
    if (dto.traceId) where.traceId = dto.traceId;
    if (dto.startAt !== undefined && dto.endAt !== undefined) {
      where.createdAt = Between(String(dto.startAt), String(dto.endAt));
    }

    const [rows, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (dto.pageNo - 1) * dto.pageSize,
      take: dto.pageSize,
    });

    const list: AuditLogVo[] = rows.map((r) => ({
      id: r.id,
      traceId: r.traceId,
      operatorType: r.operatorType,
      operatorId: r.operatorId,
      targetType: r.targetType,
      targetId: r.targetId,
      beforeStatus: r.beforeStatus,
      afterStatus: r.afterStatus,
      ip: r.ip,
      summary: r.summary,
      detailRef: r.detailRef,
      createdAt: Number(r.createdAt),
    }));

    return { pageNo: dto.pageNo, pageSize: dto.pageSize, total, list };
  }
}
