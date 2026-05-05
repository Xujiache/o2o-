import { createHash, randomBytes } from 'node:crypto';

import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import type { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../../config/redis.module';
import { MerchantAccount } from '../../database/entities';
import { AuthService } from '../auth/auth.service';
import { JTI_REVOKED_PREFIX } from '../auth/guards/scope-jwt.guard';
import { SmsService } from '../sms/sms.service';

import { MERCHANT_REFRESH_PREFIX, REFRESH_TOKEN_BYTES, parseTtlToSeconds } from './merchant-auth.constants';
import type { Platform } from './merchant-auth.dto';

interface RefreshRecord {
  merchantId: string;
  deviceId: string;
}

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshHash: string;
}

@Injectable()
export class MerchantAuthService {
  private readonly logger = new Logger(MerchantAuthService.name);

  constructor(
    @InjectRepository(MerchantAccount) private readonly merchantRepo: Repository<MerchantAccount>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly smsService: SmsService,
  ) {}

  async loginByMobile(
    mobile: string,
    code: string,
    deviceId: string,
    _platform: Platform,
    _ip: string | null,
  ): Promise<{ merchantToken: string; refreshToken: string; accountStatus: string }> {
    const ok = await this.smsService.verifyCode(mobile, 'login', code);
    if (!ok) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    await this.smsService.consumeCode(mobile, 'login', code);

    const merchant = await this.merchantRepo.findOne({ where: { mobile } });
    if (!merchant) {
      throw new NotFoundException('该手机号尚未提交入驻申请,请先入驻');
    }
    if (merchant.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用,请联系平台',
      });
    }

    const tokens = this.issueTokens(merchant.merchantId);
    await this.storeRefresh(tokens.refreshHash, merchant.merchantId, deviceId);

    return {
      merchantToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accountStatus: merchant.accountStatus,
    };
  }

  async refresh(refreshToken: string, deviceId: string): Promise<{ merchantToken: string; refreshToken: string }> {
    const oldHash = this.hashRefresh(refreshToken);
    const record = await this.loadRefresh(oldHash);
    if (!record || record.deviceId !== deviceId) {
      throw new UnauthorizedException('refresh token invalid or revoked');
    }
    const merchant = await this.merchantRepo.findOne({ where: { merchantId: record.merchantId } });
    if (!merchant) {
      throw new UnauthorizedException('merchant not found');
    }
    if (merchant.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用',
      });
    }

    // 旧 refresh 立即失效 + 新 refresh 入库
    await this.redis.del(`${MERCHANT_REFRESH_PREFIX}${oldHash}`).catch(() => undefined);
    const tokens = this.issueTokens(merchant.merchantId);
    await this.storeRefresh(tokens.refreshHash, merchant.merchantId, deviceId);

    return { merchantToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(merchantId: string, deviceId: string, jti: string | null, exp: number | null): Promise<void> {
    // 删除该设备所有 refresh(简化:全删该商家所有 refresh — stage 11+ 支持多设备时改为按 deviceId 精准删除)
    void deviceId;
    const pattern = `${MERCHANT_REFRESH_PREFIX}*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      for (const k of keys) {
        const v = await this.redis.get(k);
        if (!v) continue;
        try {
          const r = JSON.parse(v) as RefreshRecord;
          if (r.merchantId === merchantId) {
            await this.redis.del(k).catch(() => undefined);
          }
        } catch {
          /* skip corrupt */
        }
      }
    } while (cursor !== '0');

    if (jti) {
      const ttl = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : parseTtlToSeconds(this.accessTtl());
      await this.redis.set(`${JTI_REVOKED_PREFIX}${jti}`, '1', 'EX', ttl);
    }
  }

  // ===== private helpers =====

  private issueTokens(merchantId: string): IssuedTokens {
    const accessToken = this.authService.signAccessToken('merchant', merchantId, ['MERCHANT']);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshHash = this.hashRefresh(refreshToken);
    return { accessToken, refreshToken, refreshHash };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefresh(refreshHash: string, merchantId: string, deviceId: string): Promise<void> {
    const refreshTtl = parseTtlToSeconds(this.refreshTtl());
    const record: RefreshRecord = { merchantId, deviceId };
    await this.redis.set(`${MERCHANT_REFRESH_PREFIX}${refreshHash}`, JSON.stringify(record), 'EX', refreshTtl);
  }

  private async loadRefresh(refreshHash: string): Promise<RefreshRecord | null> {
    const v = await this.redis.get(`${MERCHANT_REFRESH_PREFIX}${refreshHash}`);
    if (!v) return null;
    try {
      return JSON.parse(v) as RefreshRecord;
    } catch {
      return null;
    }
  }

  private accessTtl(): string {
    return this.config.get<AppConfig['jwt']>('jwt')?.accessTtl ?? '2h';
  }

  private refreshTtl(): string {
    return this.config.get<AppConfig['jwt']>('jwt')?.refreshTtl ?? '30d';
  }
}
