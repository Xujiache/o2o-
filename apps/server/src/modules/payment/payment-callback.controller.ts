import { Controller, Headers, HttpCode, Post, Query, RawBodyRequest, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';

import { PaymentService } from './payment.service';

@ApiTags('payment-callback')
@Controller('callback')
export class PaymentCallbackController {
  constructor(private readonly service: PaymentService) {}

  @Post('wxpay')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'wxpay 异步通知(@Public,验签 + nonce 防重放 + 幂等)' })
  async wxpayCallback(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-mock-sign') headerSign: string | undefined,
    @Query('sign') querySign: string | undefined,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    const raw = (req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body ?? {})) || '';
    const sign = headerSign ?? querySign ?? 'mock-sign';
    return this.service.handleCallback('wxpay', raw, sign);
  }

  @Post('alipay')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'alipay 异步通知(@Public,验签 + nonce 防重放 + 幂等)' })
  async alipayCallback(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-mock-sign') headerSign: string | undefined,
    @Query('sign') querySign: string | undefined,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    const raw = (req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body ?? {})) || '';
    const sign = headerSign ?? querySign ?? 'mock-sign';
    return this.service.handleCallback('alipay', raw, sign);
  }
}
