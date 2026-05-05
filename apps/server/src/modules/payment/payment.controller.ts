import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { PrepayDto, PrepayVo } from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('payment')
@Controller('c/payments')
@UseGuards(CustomerJwtGuard)
@ApiBearerAuth('Customer-Token')
export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  @Post('prepay')
  @Idempotent({ scope: 'payment:prepay', ttlSeconds: 60 })
  @Audit({ targetType: 'payment-order' })
  @ApiOperation({ summary: '创建支付单(订单 WAIT_PAY,复用 pending 或新建)+ 调 wxpay/alipay adapter' })
  @ApiOkResponse({ type: PrepayVo })
  async prepay(@CurrentUser() principal: CurrentPrincipal, @Body() dto: PrepayDto): Promise<PrepayVo> {
    return this.service.prepay(principal.principalId, dto);
  }
}
