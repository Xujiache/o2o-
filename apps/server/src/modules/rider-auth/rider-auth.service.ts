import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import { Repository } from 'typeorm';

import type { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../../config/redis.module';
import { RiderAccount, RiderApplication } from '../../database/entities';
import { AuthService } from '../auth/auth.service';
import { JTI_REVOKED_PREFIX } from '../auth/guards/scope-jwt.guard';
import { SmsService } from '../sms/sms.service';

import { REFRESH_TOKEN_BYTES, RIDER_REFRESH_PREFIX, parseTtlToSeconds } from './rider-auth.constants';
import type { Platform } from './rider-auth.dto';

interface RefreshRecord {
  riderId: string;
  deviceId: string;
}

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshHash: string;
}

export interface LoginResult {
  riderId: string;
  riderToken: string;
  refreshToken: string;
  accountStatus: string;
  isNewUser: boolean;
  hasApplication: boolean;
  latestApplicationId?: string;
}

@Injectable()
export class RiderAuthService {
  private readonly logger = new Logger(RiderAuthService.name);

  constructor(
    @InjectRepository(RiderAccount) private readonly riderRepo: Repository<RiderAccount>,
    @InjectRepository(RiderApplication) private readonly applicationRepo: Repository<RiderApplication>,
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
  ): Promise<LoginResult> {
    const ok = await this.smsService.verifyCode(mobile, 'login', code);
    if (!ok) {
      throw new UnauthorizedException('验证码错误或已过期');
    }
    await this.smsService.consumeCode(mobile, 'login', code);

    const now = Date.now().toString();
    let rider = await this.riderRepo.findOne({ where: { mobile } });
    let isNewUser = false;
    if (!rider) {
      const created = this.riderRepo.create({
        mobile,
        accountStatus: 'active',
        realName: null,
        idCardNo: null,
        healthCertNo: null,
        healthCertExpiry: null,
        approvedAt: null,
        approvedApplicationId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
      rider = await this.riderRepo.save(created);
      isNewUser = true;
    } else if (rider.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用,请联系平台',
      });
    }

    // 找最新一条申请,告诉前端 hasApplication / canResubmit
    const latestApp = await this.applicationRepo.findOne({
      where: { mobile },
      order: { submittedAt: 'DESC' },
    });

    const tokens = this.issueTokens(rider.riderId);
    await this.storeRefresh(tokens.refreshHash, rider.riderId, deviceId);

    return {
      riderId: rider.riderId,
      riderToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accountStatus: rider.accountStatus,
      isNewUser,
      hasApplication: !!latestApp,
      latestApplicationId: latestApp?.applicationId,
    };
  }

  async refresh(refreshToken: string, deviceId: string): Promise<{ riderToken: string; refreshToken: string }> {
    const oldHash = this.hashRefresh(refreshToken);
    const record = await this.loadRefresh(oldHash);
    if (!record || record.deviceId !== deviceId) {
      throw new UnauthorizedException('refresh token invalid or revoked');
    }
    const rider = await this.riderRepo.findOne({ where: { riderId: record.riderId } });
    if (!rider) {
      throw new UnauthorizedException('rider not found');
    }
    if (rider.accountStatus === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已被禁用',
      });
    }

    await this.redis.del(`${RIDER_REFRESH_PREFIX}${oldHash}`).catch(() => undefined);
    const tokens = this.issueTokens(rider.riderId);
    await this.storeRefresh(tokens.refreshHash, rider.riderId, deviceId);

    return { riderToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  async logout(riderId: string, deviceId: string, jti: string | null, exp: number | null): Promise<void> {
    void deviceId;
    const pattern = `${RIDER_REFRESH_PREFIX}*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      for (const k of keys) {
        const v = await this.redis.get(k);
        if (!v) continue;
        try {
          const r = JSON.parse(v) as RefreshRecord;
          if (r.riderId === riderId) {
            await this.redis.del(k).catch(() => undefined);
          }
        } catch {
          /* skip */
        }
      }
    } while (cursor !== '0');

    if (jti) {
      const ttl = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : parseTtlToSeconds(this.accessTtl());
      await this.redis.set(`${JTI_REVOKED_PREFIX}${jti}`, '1', 'EX', ttl);
    }
  }

  // ===== private helpers =====

  private issueTokens(riderId: string): IssuedTokens {
    const accessToken = this.authService.signAccessToken('rider', riderId, ['RIDER']);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshHash = this.hashRefresh(refreshToken);
    return { accessToken, refreshToken, refreshHash };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefresh(refreshHash: string, riderId: string, deviceId: string): Promise<void> {
    const refreshTtl = parseTtlToSeconds(this.refreshTtl());
    const record: RefreshRecord = { riderId, deviceId };
    await this.redis.set(`${RIDER_REFRESH_PREFIX}${refreshHash}`, JSON.stringify(record), 'EX', refreshTtl);
  }

  private async loadRefresh(refreshHash: string): Promise<RefreshRecord | null> {
    const v = await this.redis.get(`${RIDER_REFRESH_PREFIX}${refreshHash}`);
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
