import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { CityListPageVo, CityMutationVo, CreateCityDto, ListCitiesQueryDto, UpdateCityDto } from './admin-city.dto';
import { AdminCityService } from './admin-city.service';

@ApiTags('admin-city')
@Controller('admin/cities')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminCityController {
  constructor(private readonly service: AdminCityService) {}

  @Get()
  @RequirePermission('admin:menu:cities')
  @ApiOperation({ summary: '城市站点列表(分页 + keyword + serviceEnabled 过滤)' })
  @ApiOkResponse({ type: CityListPageVo })
  async list(@Query() query: ListCitiesQueryDto): Promise<CityListPageVo> {
    return this.service.list(query);
  }

  @Post()
  @RequirePermission('admin:cities:manage')
  @Idempotent({ scope: 'admin-city:create', ttlSeconds: 60 })
  @Audit({ targetType: 'city-site' })
  @ApiOperation({ summary: '新增城市站点(GeoJSON 校验,UNIQUE cityCode)' })
  @ApiOkResponse({ type: CityMutationVo })
  async create(@Body() dto: CreateCityDto): Promise<CityMutationVo> {
    return this.service.create(dto);
  }

  @Patch(':code')
  @RequirePermission('admin:cities:manage')
  @Idempotent({ scope: 'admin-city:update', ttlSeconds: 30 })
  @Audit({ targetType: 'city-site' })
  @ApiOperation({ summary: '更新城市站点(cityCode 不可改)' })
  @ApiOkResponse({ type: CityMutationVo })
  async update(@Param('code') code: string, @Body() dto: UpdateCityDto): Promise<CityMutationVo> {
    return this.service.update(code, dto);
  }

  @Delete(':code')
  @RequirePermission('admin:cities:manage')
  @Idempotent({ scope: 'admin-city:disable', ttlSeconds: 30 })
  @Audit({ targetType: 'city-site' })
  @ApiOperation({ summary: '软禁用城市站点(serviceEnabled=false,数据保留)' })
  @ApiOkResponse({ type: CityMutationVo })
  async softDisable(@Param('code') code: string): Promise<CityMutationVo> {
    return this.service.softDisable(code);
  }
}
