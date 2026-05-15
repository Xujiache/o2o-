import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import {
  AdminListPickupPointsQueryDto,
  AdminListPickupPointsVo,
  CreatePickupPointDto,
  PickupPointMutationVo,
  UpdatePickupPointDto,
} from './pickup-point.dto';
import { PickupPointService } from './pickup-point.service';

@ApiTags('admin-pickup-point')
@Controller('admin/pickup-points')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminPickupPointController {
  constructor(private readonly service: PickupPointService) {}

  @Get()
  @RequirePermission('admin:pickup-point:read')
  @ApiOperation({ summary: '自提点列表(分页 + keyword + status 过滤)' })
  @ApiOkResponse({ type: AdminListPickupPointsVo })
  async list(@Query() query: AdminListPickupPointsQueryDto): Promise<AdminListPickupPointsVo> {
    return this.service.adminList(query);
  }

  @Post()
  @RequirePermission('admin:pickup-point:write')
  @Idempotent({ scope: 'admin-pickup-point:create', ttlSeconds: 60 })
  @Audit({ targetType: 'pickup-point' })
  @ApiOperation({ summary: '新增自提点' })
  @ApiOkResponse({ type: PickupPointMutationVo })
  async create(@Body() dto: CreatePickupPointDto): Promise<PickupPointMutationVo> {
    return this.service.adminCreate(dto);
  }

  @Patch(':pickupPointId')
  @RequirePermission('admin:pickup-point:write')
  @Idempotent({ scope: 'admin-pickup-point:update', ttlSeconds: 30 })
  @Audit({ targetType: 'pickup-point' })
  @ApiOperation({ summary: '更新自提点(部分字段)' })
  @ApiOkResponse({ type: PickupPointMutationVo })
  async update(
    @Param('pickupPointId') pickupPointId: string,
    @Body() dto: UpdatePickupPointDto,
  ): Promise<PickupPointMutationVo> {
    return this.service.adminUpdate(pickupPointId, dto);
  }

  @Delete(':pickupPointId')
  @RequirePermission('admin:pickup-point:write')
  @Idempotent({ scope: 'admin-pickup-point:delete', ttlSeconds: 30 })
  @Audit({ targetType: 'pickup-point' })
  @ApiOperation({ summary: '软下线自提点(status=offline)' })
  @ApiOkResponse({ type: PickupPointMutationVo })
  async softDelete(@Param('pickupPointId') pickupPointId: string): Promise<PickupPointMutationVo> {
    return this.service.adminSoftDelete(pickupPointId);
  }
}
