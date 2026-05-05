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
  AuditRiderDto,
  AuditRiderVo,
  ListRidersQueryDto,
  RiderDetailVo,
  RiderListPageVo,
  UpdateRiderStatusDto,
  UpdateServiceAreaDto,
} from './admin-rider.dto';
import { AdminRiderService } from './admin-rider.service';

@ApiTags('admin-rider')
@Controller('admin/riders')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminRiderController {
  constructor(private readonly service: AdminRiderService) {}

  @Get()
  @RequirePermission('admin:riders:view')
  @ApiOperation({ summary: '骑手申请列表(脱敏)' })
  @ApiOkResponse({ type: RiderListPageVo })
  async list(@Query() query: ListRidersQueryDto): Promise<RiderListPageVo> {
    return this.service.list(query);
  }

  @Get(':applicationId')
  @RequirePermission('admin:riders:view')
  @ApiOperation({ summary: '骑手申请详情(含资质文件 URL,脱敏)' })
  @ApiOkResponse({ type: RiderDetailVo })
  async detail(@Param('applicationId') applicationId: string): Promise<RiderDetailVo> {
    return this.service.getDetail(applicationId);
  }

  @Post(':applicationId/audit')
  @RequirePermission('admin:riders:manage')
  @Idempotent({ scope: 'admin-rider:audit', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-application' })
  @ApiOperation({ summary: '审核(approved / rejected)幂等' })
  @ApiOkResponse({ type: AuditRiderVo })
  async audit(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('applicationId') applicationId: string,
    @Body() dto: AuditRiderDto,
  ): Promise<AuditRiderVo> {
    return this.service.audit(applicationId, principal.principalId, dto);
  }

  @Post(':riderId/status')
  @RequirePermission('admin:riders:manage')
  @Idempotent({ scope: 'admin-rider:status', ttlSeconds: 30 })
  @Audit({ targetType: 'rider-account' })
  @ApiOperation({ summary: '骑手账号启停(disabled 时强制下线)' })
  async updateStatus(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('riderId') riderId: string,
    @Body() dto: UpdateRiderStatusDto,
  ): Promise<{ riderId: string; accountStatus: string }> {
    return this.service.updateStatus(riderId, principal.principalId, dto);
  }

  @Patch(':riderId/service-area')
  @RequirePermission('admin:riders:manage')
  @Idempotent({ scope: 'admin-rider:service-area', ttlSeconds: 30 })
  @Audit({ targetType: 'rider-service-area' })
  @ApiOperation({ summary: '骑手配送区域配置(GeoJSON Polygon)' })
  async updateServiceArea(
    @CurrentUser() principal: CurrentPrincipal,
    @Param('riderId') riderId: string,
    @Body() dto: UpdateServiceAreaDto,
  ): Promise<{ riderId: string; updated: boolean }> {
    return this.service.updateServiceArea(riderId, principal.principalId, dto);
  }
}
