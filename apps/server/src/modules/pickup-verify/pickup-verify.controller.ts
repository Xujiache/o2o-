import { Body, Controller, Get, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { VerifyLogsPageVo, VerifyLogsQueryDto, VerifyPickupDto, type VerifyPickupVo } from './pickup-verify.dto';
import { PickupVerifyService } from './pickup-verify.service';

@ApiTags('merchant-pickup-verify')
@Controller('m/pickup')
@UseGuards(MerchantJwtGuard)
@ApiBearerAuth('Merchant-Token')
export class PickupVerifyController {
  constructor(private readonly service: PickupVerifyService) {}

  @Post('verify')
  @Idempotent({ scope: 'pickup-verify', ttlSeconds: 5 })
  @Audit({ targetType: 'pickup-verify' })
  @ApiOperation({ summary: '核销提货码(扫码或手输);返回订单+行项,称重商品进入 SETTLING' })
  async verify(
    @CurrentUser() p: CurrentPrincipal,
    @Body() dto: VerifyPickupDto,
    @Ip() ip: string,
  ): Promise<VerifyPickupVo> {
    return this.service.verify(p.principalId, null, dto, ip ?? null);
  }

  @Get('verify-logs')
  @ApiOperation({ summary: '核销流水(本商家)' })
  async logs(@CurrentUser() p: CurrentPrincipal, @Query() query: VerifyLogsQueryDto): Promise<VerifyLogsPageVo> {
    return this.service.logs(p.principalId, query);
  }
}
