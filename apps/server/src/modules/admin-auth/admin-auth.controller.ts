import { Body, Controller, Get, Headers, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Audit } from '../../common/decorators/audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Idempotent } from '../../common/decorators/idempotent.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import type { CurrentPrincipal } from '../auth/types';

import { ADMIN_AUTH_IDEMPOTENT_SCOPE } from './admin-auth.constants';
import {
  AdminLoginDto,
  AdminLoginVo,
  AdminLogoutVo,
  AdminRefreshDto,
  AdminRefreshVo,
  CaptchaResponseVo,
} from './admin-auth.dto';
import { AdminAuthService } from './admin-auth.service';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Get('captcha')
  @Public()
  @ApiOperation({ summary: '获取登录图形验证码(svg-captcha + Redis 5min TTL)' })
  @ApiOkResponse({ type: CaptchaResponseVo })
  async captcha(): Promise<CaptchaResponseVo> {
    return this.service.createCaptcha();
  }

  @Post('login')
  @Public()
  @Idempotent({ scope: ADMIN_AUTH_IDEMPOTENT_SCOPE.login, ttlSeconds: 60 })
  @Audit({ targetType: 'admin-auth' })
  @ApiOperation({ summary: '管理员登录(用户名 + 密码 + captcha)' })
  @ApiOkResponse({ type: AdminLoginVo })
  async login(
    @Body() dto: AdminLoginDto,
    @Ip() ip: string,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ): Promise<AdminLoginVo> {
    const clientIp = forwardedFor?.split(',')[0]?.trim() || ip || null;
    return this.service.login({
      username: dto.username,
      password: dto.password,
      captcha: dto.captcha,
      captchaId: dto.captchaId,
      deviceId: dto.deviceId,
      ip: clientIp,
    });
  }

  @Post('refresh')
  @Public()
  @Idempotent({ scope: ADMIN_AUTH_IDEMPOTENT_SCOPE.refresh, ttlSeconds: 60 })
  @ApiOperation({ summary: '刷新 admin access token' })
  @ApiOkResponse({ type: AdminRefreshVo })
  async refresh(@Body() dto: AdminRefreshDto): Promise<AdminRefreshVo> {
    return this.service.refresh(dto.refreshToken, dto.deviceId);
  }

  @Post('logout')
  @UseGuards(AdminJwtGuard)
  @ApiBearerAuth('Admin-Token')
  @Idempotent({ scope: ADMIN_AUTH_IDEMPOTENT_SCOPE.logout, ttlSeconds: 60 })
  @Audit({ targetType: 'admin-auth' })
  @ApiOperation({ summary: 'admin 登出(jti 黑名单 + 删除全部 refresh)' })
  @ApiOkResponse({ type: AdminLogoutVo })
  async logout(@CurrentUser() principal: CurrentPrincipal): Promise<AdminLogoutVo> {
    await this.service.logout(principal.principalId, principal.jti ?? null, principal.exp ?? null);
    return { ok: true };
  }
}
