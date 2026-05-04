import { Body, Controller, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { CUSTOMER_AUTH_IDEMPOTENT_SCOPE } from './customer-auth.constants';
import {
  LoginByMobileDto,
  LoginByMobileVo,
  LoginByWechatDto,
  LoginByWechatVo,
  LogoutVo,
  RefreshTokenDto,
  RefreshTokenVo,
} from './customer-auth.dto';
import { CustomerAuthService } from './customer-auth.service';

@ApiTags('customer-auth')
@Controller('c/auth')
export class CustomerAuthController {
  constructor(private readonly service: CustomerAuthService) {}

  @Post('login')
  @Public()
  @Idempotent({ scope: CUSTOMER_AUTH_IDEMPOTENT_SCOPE.login, ttlSeconds: 60 })
  @Audit({ targetType: 'customer-auth' })
  @ApiOperation({ summary: '手机号验证码登录(自动注册)' })
  @ApiOkResponse({ type: LoginByMobileVo })
  async login(
    @Body() dto: LoginByMobileDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<LoginByMobileVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.service.loginByMobile(dto.mobile, dto.code, dto.deviceId, dto.platform, clientIp);
  }

  @Post('wechat-login')
  @Public()
  @Idempotent({ scope: CUSTOMER_AUTH_IDEMPOTENT_SCOPE.wechatLogin, ttlSeconds: 60 })
  @Audit({ targetType: 'customer-auth' })
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiOkResponse({ type: LoginByWechatVo })
  async wechatLogin(
    @Body() dto: LoginByWechatDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<LoginByWechatVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.service.loginByWechat(dto.jsCode, dto.deviceId, dto.platform, clientIp);
  }

  @Post('refresh')
  @Public()
  @Idempotent({ scope: CUSTOMER_AUTH_IDEMPOTENT_SCOPE.refresh, ttlSeconds: 60 })
  @ApiOperation({ summary: '刷新 access token(轮换 refresh)' })
  @ApiOkResponse({ type: RefreshTokenVo })
  async refresh(@Body() dto: RefreshTokenDto): Promise<RefreshTokenVo> {
    return this.service.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  @UseGuards(CustomerJwtGuard)
  @ApiBearerAuth('Customer-Token')
  @Idempotent({ scope: CUSTOMER_AUTH_IDEMPOTENT_SCOPE.logout, ttlSeconds: 60 })
  @Audit({ targetType: 'customer-auth' })
  @ApiOperation({ summary: '登出 — 写 jti 黑名单 + revoke 设备' })
  @ApiOkResponse({ type: LogoutVo })
  async logout(
    @CurrentUser() principal: CurrentPrincipal,
    @Headers('x-device-id') deviceId: string,
  ): Promise<LogoutVo> {
    await this.service.logout(principal.principalId, deviceId, principal.jti ?? null, principal.exp ?? null);
    return { ok: true };
  }
}
