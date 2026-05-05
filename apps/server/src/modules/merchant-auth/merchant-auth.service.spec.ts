import { NotFoundException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';

import type { MerchantAccount } from '../../database/entities';
import type { AuthService } from '../auth/auth.service';
import type { SmsService } from '../sms/sms.service';

import { MerchantAuthService } from './merchant-auth.service';

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
  async scan(
    _cursor: string,
    _match: string,
    _pattern: string,
    _count: string,
    __n: number,
  ): Promise<[string, string[]]> {
    const keys = [...this.store.keys()].filter((k) => k.startsWith('merchant:refresh:'));
    return ['0', keys];
  }
}

describe('MerchantAuthService', () => {
  let svc: MerchantAuthService;
  let merchants: MerchantAccount[];
  let merchantRepo: jest.Mocked<Repository<MerchantAccount>>;
  let redis: FakeRedis;
  let auth: jest.Mocked<AuthService>;
  let sms: jest.Mocked<SmsService>;

  beforeEach(() => {
    merchants = [
      {
        merchantId: '1',
        mobile: '13800000001',
        accountStatus: 'active',
        latestApplicationId: '101',
        approvedStoreId: '201',
        createdAt: '0',
        updatedAt: '0',
      } as MerchantAccount,
      {
        merchantId: '2',
        mobile: '13800000002',
        accountStatus: 'pending',
        latestApplicationId: '102',
        approvedStoreId: null,
        createdAt: '0',
        updatedAt: '0',
      } as MerchantAccount,
      {
        merchantId: '3',
        mobile: '13800000003',
        accountStatus: 'disabled',
        latestApplicationId: '103',
        approvedStoreId: '203',
        createdAt: '0',
        updatedAt: '0',
      } as MerchantAccount,
    ];

    merchantRepo = {
      findOne: jest.fn(
        async ({ where }: { where: Partial<MerchantAccount> }) =>
          merchants.find(
            (m) =>
              (where.mobile ? m.mobile === where.mobile : true) &&
              (where.merchantId ? m.merchantId === where.merchantId : true),
          ) ?? null,
      ),
    } as unknown as jest.Mocked<Repository<MerchantAccount>>;

    redis = new FakeRedis();

    auth = {
      signAccessToken: jest.fn(() => 'access-token-stub'),
    } as unknown as jest.Mocked<AuthService>;

    sms = {
      verifyCode: jest.fn(async () => true),
      consumeCode: jest.fn(async () => true),
    } as unknown as jest.Mocked<SmsService>;

    const config = {
      get: () => ({ accessTtl: '2h', refreshTtl: '30d' }),
    } as unknown as ConfigService;

    svc = new MerchantAuthService(merchantRepo, redis as never, config, auth, sms);
  });

  it('已 active 商家 login → 返 token + accountStatus=active', async () => {
    const r = await svc.loginByMobile('13800000001', '123456', 'dev-1', 'app-android', '1.1.1.1');
    expect(r.merchantToken).toBe('access-token-stub');
    expect(r.accountStatus).toBe('active');
    expect(r.refreshToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it('pending 状态商家 login → 返 token + accountStatus=pending(便于查 status)', async () => {
    const r = await svc.loginByMobile('13800000002', '123456', 'dev-2', 'app-android', null);
    expect(r.accountStatus).toBe('pending');
  });

  it('disabled 商家 login → STATUS_INVALID', async () => {
    await expect(svc.loginByMobile('13800000003', '123456', 'dev-3', 'app-android', null)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('未入驻手机号 login → NotFound', async () => {
    await expect(svc.loginByMobile('13800000999', '123456', 'dev-x', 'app-android', null)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('验证码错 → UnauthorizedException', async () => {
    sms.verifyCode.mockResolvedValueOnce(false);
    await expect(svc.loginByMobile('13800000001', '999999', 'dev-1', 'app-android', null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refresh:轮换 token + 旧 refresh 失效', async () => {
    const first = await svc.loginByMobile('13800000001', '123456', 'dev-R', 'app-android', null);
    const r = await svc.refresh(first.refreshToken, 'dev-R');
    expect(r.merchantToken).toBe('access-token-stub');
    expect(r.refreshToken).not.toBe(first.refreshToken);
    // 旧 refresh 应失效
    await expect(svc.refresh(first.refreshToken, 'dev-R')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout:写 jti 黑名单 + 删除该商家 refresh', async () => {
    await svc.loginByMobile('13800000001', '123456', 'dev-L', 'app-android', null);
    await svc.logout('1', 'dev-L', 'jti-MERCHANT-XYZ', Math.floor(Date.now() / 1000) + 3600);
    const blacklisted = await redis.exists('jti:revoked:jti-MERCHANT-XYZ');
    expect(blacklisted).toBe(1);
  });
});
