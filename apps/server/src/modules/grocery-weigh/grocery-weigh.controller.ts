import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import {
  ConfirmSettleDto,
  type ConfirmSettleVo,
  FinalizeDto,
  type FinalizeVo,
  WeighItemsDto,
  type WeighItemsVo,
} from './grocery-weigh.dto';
import { GroceryWeighService } from './grocery-weigh.service';

@ApiTags('merchant-grocery-weigh')
@Controller('m/pickup')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class GroceryWeighController {
  constructor(private readonly service: GroceryWeighService) {}

  @Post('weigh')
  @Audit({ targetType: 'grocery-weigh' })
  @ApiOperation({ summary: '录入称重项(可逐项提交;只接受 weighed 商品)' })
  async weigh(@CurrentUser() p: CurrentPrincipal, @Body() dto: WeighItemsDto): Promise<WeighItemsVo> {
    return this.service.weighItems(p.principalId, p.principalId, dto);
  }

  @Post('weigh/confirm')
  @Idempotent({ scope: 'grocery-weigh:confirm', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-weigh' })
  @ApiOperation({ summary: '确认结算:±10% 自动通过;超额退款自动;补付转 DIFF_PAYING' })
  async confirm(@CurrentUser() p: CurrentPrincipal, @Body() dto: ConfirmSettleDto): Promise<ConfirmSettleVo> {
    return this.service.confirmSettle(p.principalId, dto);
  }

  @Post('finalize')
  @Idempotent({ scope: 'grocery-finalize', ttlSeconds: 30 })
  @Audit({ targetType: 'grocery-weigh' })
  @ApiOperation({ summary: '差价补付完成后店员标记提货 → PICKED_UP' })
  async finalize(@CurrentUser() p: CurrentPrincipal, @Body() dto: FinalizeDto): Promise<FinalizeVo> {
    return this.service.finalize(p.principalId, dto);
  }
}
