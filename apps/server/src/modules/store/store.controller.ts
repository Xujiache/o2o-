import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  SetBusinessStatusDto,
  SetBusinessStatusVo,
  StoreVo,
  UpdateStoreSettingsDto,
  UpdateStoreSettingsVo,
} from './store.dto';
import { StoreService } from './store.service';

@ApiTags('merchant-store')
@Controller('m/store')
@UseGuards(MerchantJwtGuard, PermissionGuard)
@ApiBearerAuth('Merchant-Token')
export class StoreController {
  constructor(private readonly service: StoreService) {}

  @Get()
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '查询自己店铺' })
  @ApiOkResponse({ type: StoreVo })
  async getOwn(@CurrentUser() principal: CurrentPrincipal): Promise<StoreVo> {
    return this.service.getOwnStore(principal.principalId);
  }

  @Patch('settings')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'store:settings', ttlSeconds: 60 })
  @Audit({ targetType: 'store-settings' })
  @ApiOperation({ summary: '更新店铺设置(基本信息 + 营业时间 + 配送范围)' })
  @ApiOkResponse({ type: UpdateStoreSettingsVo })
  async updateSettings(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: UpdateStoreSettingsDto,
  ): Promise<UpdateStoreSettingsVo> {
    return this.service.updateSettings(principal.principalId, dto);
  }

  @Patch('business-status')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'store:business-status', ttlSeconds: 60 })
  @Audit({ targetType: 'store-business-status' })
  @ApiOperation({ summary: '切换营业状态(online/offline,paused 由平台控制)' })
  @ApiOkResponse({ type: SetBusinessStatusVo })
  async setBusinessStatus(
    @CurrentUser() principal: CurrentPrincipal,
    @Body() dto: SetBusinessStatusDto,
  ): Promise<SetBusinessStatusVo> {
    return this.service.setBusinessStatus(principal.principalId, dto);
  }
}
