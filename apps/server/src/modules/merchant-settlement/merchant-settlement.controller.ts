import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { SettlementListQueryDto, SettlementListVo } from './merchant-settlement.dto';
import { MerchantSettlementService } from './merchant-settlement.service';

@ApiTags('merchant-settlement')
@Controller('m/settlements')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class MerchantSettlementController {
  constructor(private readonly service: MerchantSettlementService) {}

  @Get()
  @ApiOperation({ summary: '商家结算列表' })
  @ApiOkResponse({ type: SettlementListVo })
  async list(@CurrentUser() p: CurrentPrincipal, @Query() q: SettlementListQueryDto): Promise<SettlementListVo> {
    return this.service.list(p.principalId, q);
  }
}
