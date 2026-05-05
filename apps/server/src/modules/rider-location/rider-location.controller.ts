import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { LocationBatchDto, LocationBatchVo, UpdateOnlineStatusDto, UpdateOnlineStatusVo } from './rider-location.dto';
import { RiderLocationService } from './rider-location.service';

@ApiTags('rider-location')
@Controller('r')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderLocationController {
  constructor(private readonly service: RiderLocationService) {}

  @Patch('online-status')
  @RequirePermission('rider:self')
  @Idempotent({ scope: 'rider-location:online-status', ttlSeconds: 30 })
  @Audit({ targetType: 'rider-online-status' })
  @ApiOperation({ summary: '骑手上线 / 下线' })
  @ApiOkResponse({ type: UpdateOnlineStatusVo })
  async updateOnlineStatus(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: UpdateOnlineStatusDto,
  ): Promise<UpdateOnlineStatusVo> {
    return this.service.updateOnlineStatus(principal.principalId, dto);
  }

  @Post('location/batch')
  @RequirePermission('rider:self')
  @Idempotent({ scope: 'rider-location:batch', ttlSeconds: 60 })
  @Audit({ targetType: 'rider-location' })
  @ApiOperation({ summary: '批量上报骑手位置(1~50 点)' })
  @ApiOkResponse({ type: LocationBatchVo })
  async batchReport(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: LocationBatchDto,
  ): Promise<LocationBatchVo> {
    return this.service.batchReport(principal.principalId, dto);
  }
}
