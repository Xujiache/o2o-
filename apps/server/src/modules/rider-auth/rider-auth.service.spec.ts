import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';

import type { RiderAccount, RiderApplication } from '../../database/entities';
import type { AuthService } from '../auth/auth.service';
import type { SmsService } from '../sms/sms.service';

import { RiderAuthService } from './rider-auth.service';

class FakeRedis {
  private store = new Map<string, { v: string; expireAt: number }>();
  async set(key: string, val: string, _flag?: string, _ttl?: number): Promise<'OK'> {
    this.store.set(key, { v: val, expireAt: Number.MAX_SAFE_INTEGER });
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key)?.v ?? null;
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }
  async scan(): Promise<[string, string[]]> {
    const keys = [...this.store.keys()].filter((k) => k.startsWith('rider:refresh:'));
    return ['0', keys];
  }
}

describe('RiderAuthService', () => {
  let svc: RiderAuthService;
  let riders: RiderAccount[];
  let applications: RiderApplication[];
  let riderRepo: jest.Mocked<Repository<RiderAccount>>;
  let appRepo: jest.Mocked<Repository<RiderApplication>>;
  let redis: FakeRedis;
  let auth: jest.Mocked<AuthService>;
  let sms: jest.Mocked<SmsService>;

  beforeEach(() => {
    riders = [
      {
        riderId: '1',
        mobile: '13900000001',
        accountStatus: 'active',
        realName: null,
        idCardNo: null,
        healthCertNo: null,
        healthCertExpiry: null,
        approvedAt: null,
        approvedApplicationId: null,
        createdAt: '0',
        updatedAt: '0',
        deletedAt: null,
      } as RiderAccount,
      {
        riderId: '2',
        mobile: '13900000002',
        accountStatus: 'disabled',
        realName: null,
        idCardNo: null,
        healthCertNo: null,
        healthCertExpiry: null,
        approvedAt: null,
        approvedApplicationId: null,
        createdAt: '0',
        updatedAt: '0',
        deletedAt: null,
      } as RiderAccount,
    ];

    applications = [
      {
        applicationId: '101',
        mobile: '13900000001',
        auditStatus: 'approved',
        submittedAt: '1000',
      } as RiderApplication,
    ];

    riderRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderAccount> }) =>
          riders.find(
            (r) =>
              (where.mobile ? r.mobile === where.mobile : true) && (where.riderId ? r.riderId === where.riderId : true),
          ) ?? null,
      ),
      create: jest.fn((entity: Partial<RiderAccount>) => entity as RiderAccount),
      save: jest.fn(async (entity: RiderAccount) => {
        const newRider = { ...entity, riderId: String(riders.length + 1) };
        riders.push(newRider);
        return newRider;
      }),
    } as unknown as jest.Mocked<Repository<RiderAccount>>;

    appRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<RiderApplication> }) =>
          applications.find((a) => (where.mobile ? a.mobile === where.mobile : true)) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<RiderApplication>>;

    redis = new FakeRedis();

    auth = {
      signAccessToken: jest.fn(() => 'rider-access-token-stub'),
    } as unknown as jest.Mocked<AuthService>;

    sms = {
      verifyCode: jest.fn(async () => true),
      consumeCode: jest.fn(async () => true),
    } as unknown as jest.Mocked<SmsService>;

    const config = {
      get: () => ({ accessTtl: '2h', refreshTtl: '30d' }),
    } as unknown as ConfigService;

    svc = new RiderAuthService(riderRepo, appRepo, redis as never, config, auth, sms);
  });

  it('已注册 rider 登录 → 返 token + accountStatus=active + isNewUser=false', async () => {
    const r = await svc.loginByMobile('13900000001', '123456', 'dev-1', 'app-android', '1.1.1.1');
    expect(r.riderToken).toBe('rider-access-token-stub');
    expect(r.accountStatus).toBe('active');
    expect(r.isNewUser).toBe(false);
    expect(r.hasApplication).toBe(true);
    expect(r.latestApplicationId).toBe('101');
    expect(r.refreshToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it('未注册手机号登录 → 自动注册 + isNewUser=true + hasApplication=false', async () => {
    const r = await svc.loginByMobile('13900000099', '123456', 'dev-NEW', 'app-android', null);
    expect(r.isNewUser).toBe(true);
    expect(r.hasApplication).toBe(false);
    expect(r.accountStatus).toBe('active');
    expect(riderRepo.save).toHaveBeenCalled();
  });

  it('disabled rider login → STATUS_INVALID', async () => {
    await expect(svc.loginByMobile('13900000002', '123456', 'dev-D', 'app-android', null)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('验证码错 → UnauthorizedException', async () => {
    sms.verifyCode.mockResolvedValueOnce(false);
    await expect(svc.loginByMobile('13900000001', '999999', 'dev-1', 'app-android', null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh:轮换 token + 旧 refresh 失效', async () => {
    const first = await svc.loginByMobile('13900000001', '123456', 'dev-R', 'app-android', null);
    const r = await svc.refresh(first.refreshToken, 'dev-R');
    expect(r.riderToken).toBe('rider-access-token-stub');
    expect(r.refreshToken).not.toBe(first.refreshToken);
    await expect(svc.refresh(first.refreshToken, 'dev-R')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refresh:deviceId 不匹配 → UnauthorizedException', async () => {
    const first = await svc.loginByMobile('13900000001', '123456', 'dev-A', 'app-android', null);
    await expect(svc.refresh(first.refreshToken, 'dev-B')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout:写 jti 黑名单 + 删除该 rider refresh', async () => {
    await svc.loginByMobile('13900000001', '123456', 'dev-L', 'app-android', null);
    await svc.logout('1', 'dev-L', 'jti-RIDER-XYZ', Math.floor(Date.now() / 1000) + 3600);
    const blacklisted = await redis.exists('jti:revoked:jti-RIDER-XYZ');
    expect(blacklisted).toBe(1);
  });
});
