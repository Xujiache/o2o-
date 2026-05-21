import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import type { AppConfig } from '../../config/configuration';
import type { PaymentOrderChannel } from '../../database/entities/payment-order.entity';

import { PaymentService } from './payment.service';

@ApiTags('payment-callback')
@Controller('callback')
export class PaymentCallbackController {
  private readonly logger = new Logger(PaymentCallbackController.name);
  constructor(
    private readonly service: PaymentService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 解析签名:
   *  - real 模式:必须从 header 或 query 取到非空 sign,否则 401
   *  - mock 模式:无签时打 warning,沿用 'mock-sign' 占位
   */
  private resolveSign(headerSign: string | undefined, querySign: string | undefined, channel: string): string {
    const sign = (headerSign ?? querySign ?? '').trim();
    const mode = this.config.get<AppConfig['integration']>('integration')?.mode ?? 'mock';
    if (mode === 'real') {
      if (!sign) {
        throw new UnauthorizedException('signature missing or invalid');
      }
      return sign;
    }
    if (!sign) {
      this.logger.warn(`[${channel}] callback without signature (INTEGRATION_MODE=mock) — accepting mock-sign`);
      return 'mock-sign';
    }
    return sign;
  }

  @Post('wxpay')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'wxpay 异步通知(@Public,验签 + nonce 防重放 + 幂等)' })
  async wxpayCallback(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-mock-sign') headerSign: string | undefined,
    @Headers('wechatpay-signature') wxSign: string | undefined,
    @Query('sign') querySign: string | undefined,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    const raw = (req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body ?? {})) || '';
    const sign = this.resolveSign(headerSign ?? wxSign, querySign, 'wxpay');
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
    // 支付宝表单回调 sign 字段会在 body 内,这里若 header/query 都没,从 body 提
    let bodyFormSign: string | undefined;
    if (!headerSign && !querySign && raw.includes('sign=')) {
      try {
        const usp = new URLSearchParams(raw);
        bodyFormSign = usp.get('sign') ?? undefined;
      } catch {
        // ignore
      }
    }
    const sign = this.resolveSign(headerSign, querySign ?? bodyFormSign, 'alipay');
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
    @Headers('wechatpay-signature') wxSign: string | undefined,
    @Query('sign') querySign: string | undefined,
  ): Promise<{ ok: boolean; duplicate?: boolean }> {
    if (channel !== 'wxpay' && channel !== 'alipay') {
      throw new BadRequestException({ code: 'INVALID_PARAM', message: 'unsupported channel' });
    }
    const raw = (req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body ?? {})) || '';
    const sign = this.resolveSign(headerSign ?? wxSign, querySign, channel);
    return this.service.handleCallback(channel, raw, sign);
  }
}
