import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';

import { CityVo, IntegrationHealthVo, QueryCityDto, QueryHealthDto } from './system.dto';
import { SystemService } from './system.service';

@ApiTags('public')
@Controller('pub/cities')
export class PublicCityController {
  constructor(private readonly service: SystemService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取开通服务的城市列表' })
  @ApiOkResponse({ type: [CityVo] })
  async list(@Query() dto: QueryCityDto): Promise<CityVo[]> {
    return this.service.listCities(dto.keyword, dto.enabled);
  }
}

@ApiTags('admin')
@ApiSecurity('Admin-Token')
@Controller('admin/integrations')
@UseGuards(AdminJwtGuard, PermissionGuard)
export class AdminIntegrationController {
  constructor(private readonly service: SystemService) {}

  @Get('health')
  @RequirePermission('admin:integrations:view')
  @ApiOperation({ summary: '第三方服务健康状态' })
  @ApiOkResponse({ type: [IntegrationHealthVo] })
  async health(@Query() dto: QueryHealthDto): Promise<IntegrationHealthVo[]> {
    return this.service.listIntegrationsHealth(dto.provider);
  }
}
