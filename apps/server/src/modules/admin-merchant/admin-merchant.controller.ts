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
  ApplicationDetailVo,
  ApplicationListPageVo,
  AuditDto,
  AuditVo,
  ForceStatusDto,
  ListApplicationsQueryDto,
  ListStoresQueryDto,
  StoreItemVo,
} from './admin-merchant.dto';
import { AdminMerchantService } from './admin-merchant.service';

@ApiTags('admin-merchant')
@Controller('admin/merchants')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminMerchantController {
  constructor(private readonly service: AdminMerchantService) {}

  @Get('applications')
  @RequirePermission('admin:merchants:view')
  @ApiOperation({ summary: '入驻申请列表(auditStatus + keyword 筛选)' })
  @ApiOkResponse({ type: ApplicationListPageVo })
  async listApplications(@Query() query: ListApplicationsQueryDto): Promise<ApplicationListPageVo> {
    return this.service.listApplications(query);
  }

  @Get('applications/:applicationId')
  @RequirePermission('admin:merchants:view')
  @ApiOperation({ summary: '申请详情(含资质文件 url)' })
  @ApiOkResponse({ type: ApplicationDetailVo })
  async getApplicationDetail(@Param('applicationId') applicationId: string): Promise<ApplicationDetailVo> {
    return this.service.getApplicationDetail(applicationId);
  }

  @Post(':applicationId/audit')
  @RequirePermission('admin:merchants:manage')
  @Idempotent({ scope: 'admin-merchant:audit', ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-application' })
  @ApiOperation({ summary: '审核申请(approved + commissionRate / rejected + reason)' })
  @ApiOkResponse({ type: AuditVo })
  async audit(
    @Param('applicationId') applicationId: string,
    @Body() dto: AuditDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<AuditVo> {
    return this.service.audit(applicationId, principal.principalId, dto);
  }

  @Get('stores')
  @RequirePermission('admin:merchants:view')
  @ApiOperation({ summary: '店铺列表(可按 business_status 筛选)' })
  async listStores(@Query() query: ListStoresQueryDto): Promise<{
    pageNo: number;
    pageSize: number;
    total: number;
    list: StoreItemVo[];
  }> {
    return this.service.listStores(query);
  }

  @Patch('stores/:storeId/business-status')
  @RequirePermission('admin:merchants:manage')
  @Idempotent({ scope: 'admin-merchant:store-status', ttlSeconds: 60 })
  @Audit({ targetType: 'store-business-status' })
  @ApiOperation({ summary: '平台强制店铺上下线 / 暂停' })
  async forceBusinessStatus(
    @Param('storeId') storeId: string,
    @Body() dto: ForceStatusDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<{ storeId: string; businessStatus: string }> {
    return this.service.forceBusinessStatus(storeId, principal.principalId, dto);
  }
}
