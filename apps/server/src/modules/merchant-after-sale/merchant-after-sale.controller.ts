import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  MerchantAfterSaleListVo,
  MerchantAfterSaleQueryDto,
  ReviewAfterSaleDto,
  ReviewAfterSaleVo,
} from './merchant-after-sale.dto';
import { MerchantAfterSaleService } from './merchant-after-sale.service';

@ApiTags('merchant-after-sale')
@Controller('m/after-sales')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantAfterSaleController {
  constructor(private readonly service: MerchantAfterSaleService) {}

  @Get()
  @ApiOperation({ summary: '商家售后列表' })
  @ApiOkResponse({ type: MerchantAfterSaleListVo })
  async list(
    @CurrentUser() p: CurrentPrincipal,
    @Query() q: MerchantAfterSaleQueryDto,
  ): Promise<MerchantAfterSaleListVo> {
    return this.service.list(p.principalId, q);
  }

  @Post(':afterSaleId/review')
  @Idempotent({ scope: 'after-sale:review', ttlSeconds: 60 })
  @Audit({ targetType: 'after-sale' })
  @ApiOperation({ summary: '商家审核售后(APPROVE / REJECT)' })
  @ApiOkResponse({ type: ReviewAfterSaleVo })
  async review(
    @CurrentUser() p: CurrentPrincipal,
    @Param('afterSaleId') afterSaleId: string,
    @Body() dto: ReviewAfterSaleDto,
  ): Promise<ReviewAfterSaleVo> {
    return this.service.review(p.principalId, afterSaleId, dto);
  }
}
