import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import type { PaymentOrderChannel } from '../../database/entities/payment-order.entity';

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

  // stage 10 路径整改:契约要求 /api/v1/callback/payments/:channel,旧路径保留兼容
  @Post('payments/:channel')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: '支付回调(stage 10 契约路径,转发到旧 service)' })
  async paymentsCallback(
    @Param('channel') channel: PaymentOrderChannel,
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-mock-sign') headerSign: string | undefined,
    @Query('sign') querySign: string | undefined,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    if (channel !== 'wxpay' && channel !== 'alipay') {
      throw new BadRequestException({ code: 'INVALID_PARAM', message: 'unsupported channel' });
    }
    const raw = (req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body ?? {})) || '';
    const sign = headerSign ?? querySign ?? 'mock-sign';
    return this.service.handleCallback(channel, raw, sign);
  }
}
