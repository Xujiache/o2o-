import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  ChangeStatusDto,
  ChangeStatusVo,
  CustomerDetailVo,
  CustomerListPageVo,
  DisableCustomerDto,
  ListCustomersQueryDto,
  RealnameRecordPageVo,
} from './admin-user.dto';
import { AdminUserService } from './admin-user.service';

@ApiTags('admin-user')
@Controller('admin/customers')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminUserController {
  constructor(private readonly service: AdminUserService) {}

  @Get()
  @RequirePermission('admin:customers:view')
  @ApiOperation({ summary: '用户列表(keyword + realnameStatus + accountStatus 三筛选)' })
  @ApiOkResponse({ type: CustomerListPageVo })
  async list(@Query() query: ListCustomersQueryDto): Promise<CustomerListPageVo> {
    return this.service.listCustomers(query);
  }

  @Get(':id')
  @RequirePermission('admin:customers:view')
  @ApiOperation({ summary: '用户详情(含资料/最近设备/风控标签)' })
  @ApiOkResponse({ type: CustomerDetailVo })
  async detail(@Param('id') id: string): Promise<CustomerDetailVo> {
    return this.service.getCustomerDetail(id);
  }

  @Get(':id/realname-records')
  @RequirePermission('admin:customers:view')
  @ApiOperation({ summary: '用户实名记录分页' })
  @ApiOkResponse({ type: RealnameRecordPageVo })
  async realnameRecords(
    @Param('id') id: string,
    @Query('pageNo') pageNo?: number,
    @Query('pageSize') pageSize?: number,
  ): Promise<RealnameRecordPageVo> {
    return this.service.listRealnameRecords(id, Number(pageNo) || 1, Number(pageSize) || 20);
  }

  @Post(':id/status')
  @RequirePermission('admin:customers:disable')
  @Idempotent({ scope: 'admin-customer:status', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-account-status' })
  @ApiOperation({ summary: '启用/禁用用户(disable 时发布 AccountDisabled + 吊销全部 login_device)' })
  @ApiOkResponse({ type: ChangeStatusVo })
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ChangeStatusVo> {
    return this.service.changeStatus(id, principal.principalId, dto);
  }

  @Post(':id/disable')
  @RequirePermission('admin:customers:disable')
  @Idempotent({ scope: 'admin-customer:disable', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-account-status' })
  @ApiOperation({ summary: '禁用用户(stage 4 contract alias)' })
  @ApiOkResponse({ type: ChangeStatusVo })
  async disable(
    @Param('id') id: string,
    @Body() dto: DisableCustomerDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ChangeStatusVo> {
    return this.service.changeStatus(id, principal.principalId, { operation: 'disable', reason: dto.reason });
  }

  @Post(':id/enable')
  @RequirePermission('admin:customers:disable')
  @Idempotent({ scope: 'admin-customer:enable', ttlSeconds: 60 })
  @Audit({ targetType: 'customer-account-status' })
  @ApiOperation({ summary: '启用用户(stage 4 contract alias)' })
  @ApiOkResponse({ type: ChangeStatusVo })
  async enable(
    @Param('id') id: string,
    @Body() dto: DisableCustomerDto,
    @CurrentUser() principal: CurrentPrincipal,
  ): Promise<ChangeStatusVo> {
    return this.service.changeStatus(id, principal.principalId, { operation: 'enable', reason: dto.reason });
  }
}
