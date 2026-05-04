import { createHash, randomBytes } from 'node:crypto';

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { DataSource, EntityManager, Repository } from 'typeorm';

import type { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../../config/redis.module';
import {
  CustomerUser,
  type CustomerRegisterSource,
  LoginDevice,
  type LoginDeviceStatus,
  type LoginDevicePlatform,
} from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { AuthService } from '../auth/auth.service';
import { JTI_REVOKED_PREFIX } from '../auth/guards/scope-jwt.guard';
import { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import { MessageSettingService } from '../message-setting/message-setting.service';
import { SmsService } from '../sms/sms.service';
import { UserProfileService } from '../user-profile/user-profile.service';

import { REFRESH_TOKEN_BYTES, parseTtlToSeconds } from './customer-auth.constants';
import type { Platform } from './customer-auth.dto';

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshHash: string;
}

@Injectable()
export class CustomerAuthService {
  private readonly logger = new Logger(CustomerAuthService.name);

  constructor(
    @InjectRepository(CustomerUser) private readonly userRepo: Repository<CustomerUser>,
    @InjectRepository(LoginDevice) private readonly deviceRepo: Repository<LoginDevice>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
    private readonly profileService: UserProfileService,
    private readonly messageSettingService: MessageSettingService,
    private readonly gateway: IntegrationGatewayService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async loginByMobile(
    mobile: string,
    code: string,
    deviceId: string,
    platform: Platform,
    ip: string | null,
  ): Promise<{ customerToken: string; refreshToken: string; isNewUser: boolean; profileCompleted: boolean }> {
    const ok = await this.smsService.verifyCode(mobile, 'login', code);
    if (!ok) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    await this.smsService.consumeCode(mobile, 'login', code);

    let user = await this.userRepo.findOne({ where: { mobile } });
    let isNewUser = false;
    if (!user) {
      user = await this.autoRegister(mobile, 'mobile', deviceId);
      isNewUser = true;
    }
    this.assertActive(user);

    const tokens = this.issueTokens(user.userId);
    await this.upsertLoginDevice(user.userId, deviceId, platform, ip, tokens.refreshHash);

    await this.eventBus.publish(
      EventName.CustomerLoggedIn,
      { userId: user.userId, deviceId, ip: ip ?? '', scene: 'login' },
      { bizType: 'customer', bizId: user.userId },
    );

    return {
      customerToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      isNewUser,
      profileCompleted: user.profileCompleted === 1,
    };
  }

  async loginByWechat(
    jsCode: string,
    deviceId: string,
    platform: Platform,
    ip: string | null,
  ): Promise<{ customerToken: string; refreshToken: string; bindMobileRequired: boolean; isNewUser: boolean }> {
    const session = await this.gateway.wxlogin.jscode2session(jsCode);
    const openId = session.openId;

    const user = await this.userRepo.findOne({ where: { wechatOpenId: openId } });
    let isNewUser = false;
    let bindMobileRequired = false;

    if (!user) {
      // 微信首次登录但无 mobile,要求前端绑定手机后再登录
      bindMobileRequired = true;
      isNewUser = true;
      // 不预创建账号 — 待 bindMobile 时通过 loginByMobile 走自动注册流程,
      // 由前端在登录页携带 jsCode 一并绑定;本阶段先返回 placeholder token。
      const tokens = this.issueTokens(`pending-${openId}`);
      return {
        customerToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        bindMobileRequired,
        isNewUser,
      };
    }

    this.assertActive(user);

    const tokens = this.issueTokens(user.userId);
    await this.upsertLoginDevice(user.userId, deviceId, platform, ip, tokens.refreshHash);

    await this.eventBus.publish(
      EventName.CustomerLoggedIn,
      { userId: user.userId, deviceId, ip: ip ?? '', scene: 'wechat-login' },
      { bizType: 'customer', bizId: user.userId },
    );

    return {
      customerToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      bindMobileRequired,
      isNewUser,
    };
  }

  async refresh(refreshToken: string, deviceId: string): Promise<{ customerToken: string; refreshToken: string }> {
    const refreshHash = this.hashRefresh(refreshToken);
    const device = await this.deviceRepo.findOne({
      where: { refreshTokenHash: refreshHash, deviceId, status: 'active' as LoginDeviceStatus },
    });
    if (!device) {
      throw new UnauthorizedException('refresh token invalid or revoked');
    }
    const user = await this.userRepo.findOne({ where: { userId: device.userId } });
    if (!user) {
      throw new UnauthorizedException('user not found');
    }
    this.assertActive(user);

    const tokens = this.issueTokens(user.userId);
    device.refreshTokenHash = tokens.refreshHash;
    device.lastActiveAt = String(Date.now());
    await this.deviceRepo.save(device);

    await this.eventBus.publish(
      EventName.CustomerLoggedIn,
      { userId: user.userId, deviceId, ip: '', scene: 'refresh' },
      { bizType: 'customer', bizId: user.userId },
    );

    return { customerToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(userId: string, deviceId: string, jti: string | null, exp: number | null): Promise<void> {
    await this.deviceRepo.update({ userId, deviceId }, { status: 'revoked' as LoginDeviceStatus });
    if (jti) {
      const ttl = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : parseTtlToSeconds(this.accessTtl());
      await this.redis.set(`${JTI_REVOKED_PREFIX}${jti}`, '1', 'EX', ttl);
    }
  }

  /**
   * 后台禁用账号:UPDATE login_device 全部 revoked,所有 active 设备的 refresh hash 已失效;
   * 同时(若有 access token jti 已知)写黑名单。本阶段简化为仅 device revoke + (jti blacklist 由 refresh 流程自然失效)。
   */
  async revokeAllDevices(userId: string): Promise<void> {
    await this.deviceRepo.update({ userId }, { status: 'revoked' as LoginDeviceStatus });
  }

  // ===== private helpers =====

  private async autoRegister(mobile: string, source: CustomerRegisterSource, deviceId: string): Promise<CustomerUser> {
    return this.dataSource.transaction(async (em: EntityManager) => {
      const now = String(Date.now());
      const userRepo = em.getRepository(CustomerUser);
      const user = userRepo.create({
        mobile,
        wechatOpenId: null,
        accountStatus: 'active',
        realnameStatus: 'unverified',
        profileCompleted: 0,
        registerSource: source,
        registerDeviceId: deviceId,
        createdAt: now,
        updatedAt: now,
      });
      const saved = await userRepo.save(user);
      await this.profileService.createDefault(saved.userId, em);
      await this.messageSettingService.createDefault(saved.userId, em);

      // 发布事件 — 在事务外执行更稳,但本阶段订阅器仅记录日志,事务内/外均可。
      // 这里在事务内 publish:bus 自身落表 status=pending,事务回滚则一并丢弃。
      await this.eventBus.publish(
        EventName.CustomerRegistered,
        { userId: saved.userId, mobile, registerSource: source, deviceId },
        { bizType: 'customer', bizId: saved.userId },
      );
      return saved;
    });
  }

  private assertActive(user: CustomerUser): void {
    if (user.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用,请联系客服',
      });
    }
  }

  private async upsertLoginDevice(
    userId: string,
    deviceId: string,
    platform: Platform,
    ip: string | null,
    refreshHash: string,
  ): Promise<void> {
    const now = String(Date.now());
    const existing = await this.deviceRepo.findOne({ where: { userId, deviceId } });
    if (existing) {
      existing.platform = platform as LoginDevicePlatform;
      existing.refreshTokenHash = refreshHash;
      existing.loginIp = ip;
      existing.loginAt = now;
      existing.lastActiveAt = now;
      existing.status = 'active' as LoginDeviceStatus;
      await this.deviceRepo.save(existing);
    } else {
      await this.deviceRepo.insert({
        userId,
        deviceId,
        platform: platform as LoginDevicePlatform,
        refreshTokenHash: refreshHash,
        loginIp: ip,
        loginCity: null,
        loginAt: now,
        lastActiveAt: now,
        status: 'active' as LoginDeviceStatus,
      });
    }
  }

  private issueTokens(userId: string): IssuedTokens {
    const accessToken = this.authService.signAccessToken('customer', userId, ['CUSTOMER']);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshHash = this.hashRefresh(refreshToken);
    return { accessToken, refreshToken, refreshHash };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private accessTtl(): string {
    return this.config.get<AppConfig['jwt']>('jwt')?.accessTtl ?? '2h';
  }

  // 留给上层(异常 / 限流 / 调试)的统一抛错
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private rateLimitException(message: string): HttpException {
    return new HttpException({ code: ErrorCode.RATE_LIMIT_EXCEEDED, message }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
