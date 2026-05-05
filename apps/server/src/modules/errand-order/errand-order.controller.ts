import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { QuoteErrandDto, QuoteVo, SubmitErrandDto, SubmitErrandVo } from './errand-order.dto';
import { ErrandOrderService } from './errand-order.service';

@ApiTags('errand-order')
@Controller('c/errand')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class ErrandOrderController {
  constructor(private readonly service: ErrandOrderService) {}

  @Post('quotes')
  @Idempotent({ scope: 'errand:quote', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-quote' })
  @ApiOperation({ summary: '跑腿报价(同步,不下单)' })
  @ApiOkResponse({ type: QuoteVo })
  async quote(@CurrentUser() p: CurrentPrincipal, @Body() dto: QuoteErrandDto): Promise<QuoteVo> {
    return this.service.quote(p.principalId, dto);
  }

  @Post('orders')
  @Idempotent({ scope: 'errand:submit', ttlSeconds: 60 })
  @Audit({ targetType: 'errand-order' })
  @ApiOperation({ summary: '提交跑腿订单 + 创建支付单' })
  @ApiOkResponse({ type: SubmitErrandVo })
  async submit(@CurrentUser() p: CurrentPrincipal, @Body() dto: SubmitErrandDto): Promise<SubmitErrandVo> {
    return this.service.submit(p.principalId, dto);
  }
}
