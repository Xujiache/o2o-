import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';
import { SMS_IDEMPOTENT_SCOPE } from '../sms/sms.constants';
import { SendSmsCodeDto, SendSmsCodeVo } from '../sms/sms.dto';
import { SmsService } from '../sms/sms.service';

import { MERCHANT_AUTH_IDEMPOTENT_SCOPE } from './merchant-auth.constants';
import { LoginByMobileDto, LoginByMobileVo, LogoutVo, RefreshTokenDto, RefreshTokenVo } from './merchant-auth.dto';
import { MerchantAuthService } from './merchant-auth.service';

@ApiTags('merchant-auth')
@Controller('m/auth')
export class MerchantAuthController {
  constructor(
    private readonly service: MerchantAuthService,
    private readonly smsService: SmsService,
  ) {}

  @Post('sms-code')
  @Public()
  @Idempotent({ scope: SMS_IDEMPOTENT_SCOPE, ttlSeconds: 60 })
  @ApiOperation({ summary: '商家端发送短信验证码(复用 sms 模块)' })
  @ApiOkResponse({ type: SendSmsCodeVo })
  async sendSms(
    @Body() dto: SendSmsCodeDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<SendSmsCodeVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.smsService.sendCode(dto.mobile, dto.scene, clientIp);
  }

  @Post('login')
  @Public()
  @Idempotent({ scope: MERCHANT_AUTH_IDEMPOTENT_SCOPE.login, ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-auth' })
  @ApiOperation({ summary: '商家手机号验证码登录(无自动注册)' })
  @ApiOkResponse({ type: LoginByMobileVo })
  async login(
    @Body() dto: LoginByMobileDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<LoginByMobileVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.service.loginByMobile(dto.mobile, dto.code, dto.deviceId, dto.platform, clientIp);
  }

  @Post('refresh')
  @Public()
  @Idempotent({ scope: MERCHANT_AUTH_IDEMPOTENT_SCOPE.refresh, ttlSeconds: 60 })
  @ApiOperation({ summary: '刷新商家 access token(轮换 refresh)' })
  @ApiOkResponse({ type: RefreshTokenVo })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenVo> {
    return this.service.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  @UseGuards(MerchantJwtGuard)
  @ApiBearerAuth('Merchant-Token')
  @Idempotent({ scope: MERCHANT_AUTH_IDEMPOTENT_SCOPE.logout, ttlSeconds: 60 })
  @Audit({ targetType: 'merchant-auth' })
  @ApiOperation({ summary: '商家登出 — 写 jti 黑名单 + 删除 refresh' })
  @ApiOkResponse({ type: LogoutVo })
  async logout(
    @CurrentUser() principal: CurrentPrincipal,
    @Headers('x-device-id') deviceId: string,
  ): Promise<LogoutVo> {
    await this.service.logout(principal.principalId, deviceId, principal.jti ?? null, principal.exp ?? null);
    return { ok: true };
  }
}
