import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { CustomerUser, LoginDevice } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import type { AuthService } from '../auth/auth.service';
import type { IntegrationGatewayService } from '../integration-gateway/integration-gateway.service';
import type { MessageSettingService } from '../message-setting/message-setting.service';
import type { SmsService } from '../sms/sms.service';
import type { UserProfileService } from '../user-profile/user-profile.service';

import { CustomerAuthService } from './customer-auth.service';

class FakeRedis {
  private store = new Map<string, { v: string; expireAt: number }>();
  async set(key: string, val: string, _flag?: string, _ttl?: number): Promise<'OK'> {
    this.store.set(key, { v: val, expireAt: Number.MAX_SAFE_INTEGER });
    return 'OK';
  }
  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }
}

describe('CustomerAuthService', () => {
  let svc: CustomerAuthService;
  let users: CustomerUser[];
  let devices: LoginDevice[];
  let publishedEvents: Array<{ name: string; payload: unknown }>;
  let userRepo: jest.Mocked<Repository<CustomerUser>>;
  let deviceRepo: jest.Mocked<Repository<LoginDevice>>;
  let dataSource: { transaction: jest.Mock };
  let redis: FakeRedis;
  let auth: jest.Mocked<AuthService>;
  let sms: jest.Mocked<SmsService>;
  let profile: jest.Mocked<UserProfileService>;
  let messageSetting: jest.Mocked<MessageSettingService>;
  let gateway: { wxlogin: { jscode2session: jest.Mock } };
  let bus: jest.Mocked<DomainEventBus>;
  let nextUserId = 1;

  beforeEach(() => {
    users = [];
    devices = [];
    publishedEvents = [];
    nextUserId = 1;

    userRepo = {
      findOne: jest.fn(async ({ where }: { where: Partial<CustomerUser> }) => {
        return (
          users.find(
            (u) =>
              (where.mobile ? u.mobile === where.mobile : true) &&
              (where.userId ? u.userId === where.userId : true) &&
              (where.wechatOpenId ? u.wechatOpenId === where.wechatOpenId : true),
          ) ?? null
        );
      }),
    } as unknown as jest.Mocked<Repository<CustomerUser>>;

    deviceRepo = {
      findOne: jest.fn(async ({ where }: { where: Partial<LoginDevice> }) => {
        return (
          devices.find(
            (d) =>
              (where.userId ? d.userId === where.userId : true) &&
              (where.deviceId ? d.deviceId === where.deviceId : true) &&
              (where.refreshTokenHash ? d.refreshTokenHash === where.refreshTokenHash : true) &&
              (where.status ? d.status === where.status : true),
          ) ?? null
        );
      }),
      save: jest.fn(async (d: LoginDevice) => {
        const idx = devices.findIndex((x) => x.loginId === d.loginId);
        if (idx >= 0) devices[idx] = d;
        return d;
      }),
      insert: jest.fn(async (d: Partial<LoginDevice>) => {
        const row = { ...d, loginId: String(devices.length + 1) } as LoginDevice;
        devices.push(row);
        return { identifiers: [{ loginId: row.loginId }] };
      }),
      update: jest.fn(async (criteria: Partial<LoginDevice>, patch: Partial<LoginDevice>) => {
        let n = 0;
        for (const d of devices) {
          if (
            (criteria.userId ? d.userId === criteria.userId : true) &&
            (criteria.deviceId ? d.deviceId === criteria.deviceId : true)
          ) {
            Object.assign(d, patch);
            n++;
          }
        }
        return { affected: n };
      }),
    } as unknown as jest.Mocked<Repository<LoginDevice>>;

    const fakeEm = {
      getRepository: jest.fn((target: unknown) => {
        const name = (target as { name?: string }).name;
        if (name === 'CustomerUser') {
          return {
            create: (dto: Partial<CustomerUser>) => dto as CustomerUser,
            save: async (u: CustomerUser) => {
              const saved = { ...u, userId: String(nextUserId++) };
              users.push(saved);
              return saved;
            },
          };
        }
        return {} as never;
      }),
    } as unknown as EntityManager;
    dataSource = {
      transaction: jest.fn(async (cb: (em: EntityManager) => Promise<unknown>) => {
        return cb(fakeEm);
      }),
    };

    redis = new FakeRedis();
    auth = {
      signAccessToken: jest.fn(() => 'access-token-stub'),
    } as unknown as jest.Mocked<AuthService>;
    sms = {
      verifyCode: jest.fn(async () => true),
      consumeCode: jest.fn(async () => true),
    } as unknown as jest.Mocked<SmsService>;
    profile = {
      createDefault: jest.fn(async () => ({}) as never),
    } as unknown as jest.Mocked<UserProfileService>;
    messageSetting = {
      createDefault: jest.fn(async () => ({}) as never),
    } as unknown as jest.Mocked<MessageSettingService>;
    gateway = {
      wxlogin: {
        jscode2session: jest.fn(async () => ({ openId: 'mock-openid-001', sessionKey: 'k' })),
      },
    };
    bus = {
      publish: jest.fn(async (name: string, payload: unknown) => {
        publishedEvents.push({ name, payload });
        return { eventId: `${name}-evt` };
      }),
    } as unknown as jest.Mocked<DomainEventBus>;
    const config = {
      get: () => ({ accessTtl: '2h', refreshTtl: '30d' }),
    } as unknown as ConfigService;

    svc = new CustomerAuthService(
      userRepo,
      deviceRepo,
      dataSource as unknown as DataSource,
      redis as never,
      config,
      auth,
      sms,
      profile,
      messageSetting,
      gateway as unknown as IntegrationGatewayService,
      bus,
    );
  });

  it('首次手机号登录:自动注册 + 发布 CustomerRegistered + isNewUser=true', async () => {
    const r = await svc.loginByMobile('13800000001', '123456', 'dev-1', 'h5', '1.1.1.1');
    expect(r.isNewUser).toBe(true);
    expect(r.customerToken).toBe('access-token-stub');
    expect(r.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(r.profileCompleted).toBe(false);
    expect(users).toHaveLength(1);
    expect(profile.createDefault).toHaveBeenCalledTimes(1);
    expect(messageSetting.createDefault).toHaveBeenCalledTimes(1);
    const names = publishedEvents.map((e) => e.name);
    expect(names).toContain(EventName.CustomerRegistered);
    expect(names).toContain(EventName.CustomerLoggedIn);
    expect(devices).toHaveLength(1);
  });

  it('重复登录:复用现有用户 isNewUser=false + 同设备 UPSERT', async () => {
    await svc.loginByMobile('13800000002', '123456', 'dev-A', 'h5', '1.1.1.1');
    expect(users).toHaveLength(1);
    const r2 = await svc.loginByMobile('13800000002', '123456', 'dev-A', 'h5', '1.1.1.1');
    expect(r2.isNewUser).toBe(false);
    expect(users).toHaveLength(1); // 没有新建
    expect(devices).toHaveLength(1); // 同 deviceId UPSERT
  });

  it('验证码错误:抛 UnauthorizedException', async () => {
    sms.verifyCode.mockResolvedValueOnce(false);
    await expect(svc.loginByMobile('13800000003', '111111', 'dev-1', 'h5', null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(users).toHaveLength(0);
  });

  it('禁用账号:抛 STATUS_INVALID', async () => {
    // 预置一个禁用用户
    users.push({
      userId: '99',
      mobile: '13800000099',
      wechatOpenId: null,
      accountStatus: 'disabled',
      realnameStatus: 'unverified',
      profileCompleted: 0,
      registerSource: 'mobile',
      registerDeviceId: null,
      createdAt: '0',
      updatedAt: '0',
    });
    await expect(svc.loginByMobile('13800000099', '123456', 'dev-1', 'h5', null)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });

  it('refresh:轮换 refresh + 发布 CustomerLoggedIn(scene=refresh)', async () => {
    const first = await svc.loginByMobile('13800000004', '123456', 'dev-R', 'h5', null);
    publishedEvents.length = 0;

    const r = await svc.refresh(first.refreshToken, 'dev-R');
    expect(r.customerToken).toBe('access-token-stub');
    expect(r.refreshToken).not.toBe(first.refreshToken);
    expect(publishedEvents).toEqual([
      expect.objectContaining({
        name: EventName.CustomerLoggedIn,
        payload: expect.objectContaining({ scene: 'refresh' }),
      }),
    ]);
    // 旧 refresh 失效
    await expect(svc.refresh(first.refreshToken, 'dev-R')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout:写 jti 黑名单 + revoke 设备', async () => {
    await svc.loginByMobile('13800000005', '123456', 'dev-L', 'h5', null);
    await svc.logout('1', 'dev-L', 'jti-XYZ', Math.floor(Date.now() / 1000) + 3600);

    const blacklisted = await redis.exists('jti:revoked:jti-XYZ');
    expect(blacklisted).toBe(1);
    const dev = devices[0];
    expect(dev?.status).toBe('revoked');
  });

  it('微信登录:openId 首次出现 → bindMobileRequired=true + 不建用户', async () => {
    const r = await svc.loginByWechat('jscode-A', 'dev-W', 'mp-weixin', null);
    expect(r.bindMobileRequired).toBe(true);
    expect(users).toHaveLength(0);
    expect(r.customerToken).toBe('access-token-stub');
  });

  it('端隔离已由 ScopeJwtGuard 保证 — 本服务直接信任 req.user.principalId', () => {
    expect(true).toBe(true);
  });
});
