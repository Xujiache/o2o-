import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  CreatePromotionDto,
  CreatePromotionVo,
  ListPromotionsQueryDto,
  PromotionItemVo,
  SetPromoStatusDto,
} from './merchant-promotion.dto';
import { MerchantPromotionService } from './merchant-promotion.service';

@ApiTags('merchant-promotion')
@Controller('m/promotions')
@UseGuards(MerchantJwtGuard, PermissionGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantPromotionController {
  constructor(private readonly service: MerchantPromotionService) {}

  @Post()
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'promotion:create', ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-promotion' })
  @ApiOperation({ summary: '创建限时折扣 / 单品满减' })
  @ApiOkResponse({ type: CreatePromotionVo })
  async create(@CurrentUser() p: CurrentPrincipal, @Body() dto: CreatePromotionDto): Promise<CreatePromotionVo> {
    return this.service.create(p.principalId, dto);
  }

  @Get()
  @RequirePermission('merchant:store:own')
  @ApiOperation({ summary: '促销列表' })
  @ApiOkResponse({ type: [PromotionItemVo] })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: ListPromotionsQueryDto): Promise<PromotionItemVo[]> {
    return this.service.list(p.principalId, q);
  }

  @Patch(':promoId/status')
  @RequirePermission('merchant:store:own')
  @Idempotent({ scope: 'promotion:status', ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-promotion' })
  @ApiOperation({ summary: '切换促销状态(scheduled/active/paused/ended)' })
  async setStatus(
    @CurrentUser() p: CurrentPrincipal,
    @Param('promoId') promoId: string,
    @Body() dto: SetPromoStatusDto,
  ): Promise<{ promoId: string; status: string }> {
    return this.service.setStatus(p.principalId, promoId, dto);
  }
}
