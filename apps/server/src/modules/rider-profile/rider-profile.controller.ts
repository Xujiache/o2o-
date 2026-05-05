import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { instanceToPlain, plainToInstance } from 'class-transformer';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RiderJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { RiderProfileVo, UpdateRiderProfileDto } from './rider-profile.dto';
import { RiderProfileService } from './rider-profile.service';

@ApiTags('rider-profile')
@Controller('r/profile')
@UseGuards(RiderJwtGuard, PermissionGuard)
@ApiBearerAuth('Rider-Token')
export class RiderProfileController {
  constructor(private readonly service: RiderProfileService) {}

  @Get()
  @RequirePermission('rider:self')
  @ApiOperation({ summary: '查询骑手个人资料' })
  @ApiOkResponse({ type: RiderProfileVo })
  async get(@CurrentUser() principal: CurrentPrincipal): Promise<RiderProfileVo> {
    const r = await this.service.getProfile(principal.principalId);
    return instanceToPlain(plainToInstance(RiderProfileVo, r, { excludeExtraneousValues: false })) as RiderProfileVo;
  }

  @Patch()
  @RequirePermission('rider:self')
  @Idempotent({ scope: 'rider-profile:update', ttlSeconds: 30 })
  @Audit({ targetType: 'rider-profile' })
  @ApiOperation({ summary: '更新骑手资料(本阶段仅 vehicle 可改)' })
  async update(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: UpdateRiderProfileDto,
  ): Promise<{ ok: boolean }> {
    await this.service.update(principal.principalId, dto);
    return { ok: true };
  }
}
