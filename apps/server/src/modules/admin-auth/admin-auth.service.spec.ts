import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';

import { hashPassword } from '../../common/utils/password.util';
import type { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import type { DomainEventBus } from '../../events/domain-event-bus';
import type { AuthService } from '../auth/auth.service';

import { AdminAuthService } from './admin-auth.service';

class FakeRedis {
  store = new Map<string, string>();
  async set(key: string, val: string): Promise<'OK'> {
    this.store.set(key, val);
    return 'OK';
  }
  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }
  async scan(_cursor: string, _match: string, pattern: string): Promise<[string, string[]]> {
    void _cursor;
    void _match;
    const prefix = pattern.replace('*', '');
    const keys = [...this.store.keys()].filter((k) => k.startsWith(prefix));
    return ['0', keys];
  }
}

describe('AdminAuthService', () => {
  let svc: AdminAuthService;
  let admins: AdminUser[];
  let adminRepo: jest.Mocked<Repository<AdminUser>>;
  let roleRepo: jest.Mocked<Repository<SysRole>>;
  let permRepo: jest.Mocked<Repository<SysPermission>>;
  let rpRepo: jest.Mocked<Repository<SysRolePermission>>;
  let redis: FakeRedis;
  let auth: jest.Mocked<AuthService>;
  let bus: jest.Mocked<DomainEventBus>;

  beforeEach(() => {
    admins = [
      {
        adminUserId: '40001',
        username: 'super_admin',
        passwordHash: hashPassword('O2o@2026-Admin'),
        displayName: '超级管理员',
        status: 'active',
        roleCodes: ['SUPER_ADMIN'],
        loginFailedCount: 0,
        lockedUntil: '0',
        lastLoginAt: '0',
        createdAt: '0',
        updatedAt: '0',
      } as AdminUser,
      {
        adminUserId: '40002',
        username: 'auditor1',
        passwordHash: hashPassword('AuditorPwd1'),
        displayName: '审核员1',
        status: 'disabled',
        roleCodes: ['AUDITOR'],
        loginFailedCount: 0,
        lockedUntil: '0',
        lastLoginAt: '0',
        createdAt: '0',
        updatedAt: '0',
      } as AdminUser,
    ];

    adminRepo = {
      findOne: jest.fn(({ where }: { where: Partial<AdminUser> }) => {
        const found = admins.find((a) => a.username === where.username || a.adminUserId === where.adminUserId);
        return Promise.resolve(found ?? null);
      }),
      update: jest.fn((criteria: Partial<AdminUser>, updates: Partial<AdminUser>) => {
        const idx = admins.findIndex((a) => a.adminUserId === criteria.adminUserId);
        if (idx >= 0) {
          admins[idx] = { ...admins[idx]!, ...updates };
        }
        return Promise.resolve({ affected: 1, raw: [] });
      }),
    } as unknown as jest.Mocked<Repository<AdminUser>>;

    const roleData = [{ id: '1', code: 'SUPER_ADMIN' }] as SysRole[];
    const rpData = [
      { roleId: '1', permissionId: '100' },
      { roleId: '1', permissionId: '101' },
    ] as SysRolePermission[];
    const permData = [
      { id: '100', code: 'admin:menu:audit-logs', type: 'menu' },
      { id: '101', code: 'admin:audit:logs:view', type: 'data' },
    ] as SysPermission[];

    const makeQB = (data: unknown[]) => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(data),
    });

    roleRepo = { createQueryBuilder: jest.fn(() => makeQB(roleData)) } as unknown as jest.Mocked<Repository<SysRole>>;
    permRepo = { createQueryBuilder: jest.fn(() => makeQB(permData)) } as unknown as jest.Mocked<
      Repository<SysPermission>
    >;
    rpRepo = { createQueryBuilder: jest.fn(() => makeQB(rpData)) } as unknown as jest.Mocked<
      Repository<SysRolePermission>
    >;

    redis = new FakeRedis();
    auth = {
      signAccessToken: jest.fn().mockReturnValue('admin-token-mock'),
    } as unknown as jest.Mocked<AuthService>;
    bus = { publish: jest.fn().mockResolvedValue({ eventId: 'e1' }) } as unknown as jest.Mocked<DomainEventBus>;

    const config = {
      get: jest.fn((k: string) => {
        if (k === 'integration') return { mode: 'mock' };
        if (k === 'jwt') return { accessTtl: '2h', refreshTtl: '7d' };
        return undefined;
      }),
    } as unknown as ConfigService;

    svc = new AdminAuthService(adminRepo, roleRepo, permRepo, rpRepo, redis as unknown as never, config, auth, bus);
  });

  describe('createCaptcha', () => {
    it('返 captchaId + svgImage,Redis 写入 lowercase', async () => {
      const r = await svc.createCaptcha();
      expect(r.captchaId).toBeTruthy();
      expect(r.svgImage).toContain('<svg');
      const key = [...redis.store.keys()].find((k) => k.startsWith('admin:captcha:'));
      expect(key).toBeTruthy();
      expect(redis.store.get(key!)).toMatch(/^[a-z0-9]+$/);
    });

    it('连续两次 createCaptcha → captchaId 不同', async () => {
      const a = await svc.createCaptcha();
      const b = await svc.createCaptcha();
      expect(a.captchaId).not.toBe(b.captchaId);
      expect(redis.store.size).toBe(2);
    });

    it('captcha text 长度 4(svg-captcha size=4)', async () => {
      await svc.createCaptcha();
      const key = [...redis.store.keys()][0]!;
      expect(redis.store.get(key)!.length).toBe(4);
    });

    it('captchaId 为 uuid v4 格式', async () => {
      const r = await svc.createCaptcha();
      expect(r.captchaId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('svgImage 含 <svg> 闭合标签', async () => {
      const r = await svc.createCaptcha();
      expect(r.svgImage).toContain('</svg>');
    });

    it('captcha text 仅包含小写字母 / 数字(toLowerCase 后)', async () => {
      for (let i = 0; i < 5; i++) await svc.createCaptcha();
      for (const v of redis.store.values()) {
        expect(v).toMatch(/^[a-z0-9]+$/);
      }
    });
  });

  describe('login', () => {
    it('mock 模式 captcha=dev → 跳过 captcha 校验,返 token + 角色 + 权限', async () => {
      const r = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      expect(r.adminToken).toBe('admin-token-mock');
      expect(r.roleCodes).toEqual(['SUPER_ADMIN']);
      expect(r.permissions).toContain('admin:menu:audit-logs');
      expect(r.menus).toContain('admin:menu:audit-logs');
      expect(bus.publish).toHaveBeenCalledWith(
        'domain.admin.logged-in',
        expect.objectContaining({ adminUserId: '40001', username: 'super_admin' }),
        expect.objectContaining({ bizType: 'admin-auth', bizId: '40001' }),
      );
    });

    it('用户名不存在 → UNAUTHORIZED', async () => {
      await expect(svc.login({ username: 'no-such', password: 'x', captcha: 'dev', captchaId: 'any' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('账号 disabled → STATUS_INVALID', async () => {
      await expect(
        svc.login({ username: 'auditor1', password: 'AuditorPwd1', captcha: 'dev', captchaId: 'any' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('密码错 → UNAUTHORIZED + login_failed_count 累加', async () => {
      await expect(
        svc.login({ username: 'super_admin', password: 'wrong', captcha: 'dev', captchaId: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(admins[0]!.loginFailedCount).toBe(1);
    });

    it('密码错 ≥5 次 → 锁定 30 分钟,后续登录返 ACCOUNT_LOCKED', async () => {
      for (let i = 0; i < 5; i++) {
        await expect(
          svc.login({ username: 'super_admin', password: 'wrong', captcha: 'dev', captchaId: 'any' }),
        ).rejects.toThrow(UnauthorizedException);
      }
      // 第 5 次密码错触发锁
      const lockedUntil = Number(admins[0]!.lockedUntil);
      expect(lockedUntil).toBeGreaterThan(Date.now());
      // 立即用正确密码也无法登录
      await expect(
        svc.login({ username: 'super_admin', password: 'O2o@2026-Admin', captcha: 'dev', captchaId: 'any' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('mock 模式 captcha 不为 dev → 走 Redis 校验,Redis 无 → CAPTCHA_EXPIRED', async () => {
      // 直接用 'abcd'(非 dev),Redis 不写,应当 expired
      await expect(
        svc.login({ username: 'super_admin', password: 'O2o@2026-Admin', captcha: 'abcd', captchaId: 'no-such' }),
      ).rejects.toThrow(/验证码/);
    });

    it('成功登录 reset 失败计数 + 写 lastLoginAt', async () => {
      const before = Date.now();
      const r = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      expect(r.lastLoginAt).toBe(0); // 首次登录 previousLoginAt = 0
      expect(admins[0]!.loginFailedCount).toBe(0);
      expect(Number(admins[0]!.lastLoginAt)).toBeGreaterThanOrEqual(before);
    });

    it('第二次成功登录 → lastLoginAt 返上一次时间(非 0)', async () => {
      const r1 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      const firstLoginTs = Number(admins[0]!.lastLoginAt);
      void r1;
      const r2 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      expect(r2.lastLoginAt).toBe(firstLoginTs);
    });
  });

  describe('refresh', () => {
    it('正确 refresh → 返新 token + 失效旧 refresh', async () => {
      const r1 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      const r2 = await svc.refresh(r1.refreshToken);
      expect(r2.adminToken).toBe('admin-token-mock');
      expect(r2.refreshToken).not.toBe(r1.refreshToken);
      // 旧 refresh 已失效
      await expect(svc.refresh(r1.refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('refresh 不存在 → UNAUTHORIZED', async () => {
      await expect(svc.refresh('no-such')).rejects.toThrow(UnauthorizedException);
    });

    it('refresh + deviceId 不匹配 → UNAUTHORIZED', async () => {
      const r1 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
        deviceId: 'pc-1',
      });
      await expect(svc.refresh(r1.refreshToken, 'pc-2')).rejects.toThrow(UnauthorizedException);
    });

    it('refresh 时 admin disabled → STATUS_INVALID', async () => {
      const r1 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      // 模拟 admin 在线期间被禁用
      admins[0]!.status = 'disabled';
      await expect(svc.refresh(r1.refreshToken)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('logout', () => {
    it('logout 后 jti 写黑名单 + refresh 全删', async () => {
      const r = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      await svc.logout('40001', 'jti-xyz', Math.floor(Date.now() / 1000) + 7200);
      // jti 黑名单
      expect(redis.store.get('jti:revoked:jti-xyz')).toBe('1');
      // refresh 已删
      const refreshKeys = [...redis.store.keys()].filter((k) => k.startsWith('admin:refresh:'));
      expect(refreshKeys).toHaveLength(0);
      void r;
    });

    it('logout 不带 jti → 仅删 refresh,不写黑名单', async () => {
      await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      await svc.logout('40001', null, null);
      const refreshKeys = [...redis.store.keys()].filter((k) => k.startsWith('admin:refresh:'));
      expect(refreshKeys).toHaveLength(0);
      const blacklistKeys = [...redis.store.keys()].filter((k) => k.startsWith('jti:revoked:'));
      expect(blacklistKeys).toHaveLength(0);
    });

    it('logout 重复调用 → 幂等不抛错', async () => {
      await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      await svc.logout('40001', 'jti-1', Math.floor(Date.now() / 1000) + 7200);
      await expect(svc.logout('40001', 'jti-1', Math.floor(Date.now() / 1000) + 7200)).resolves.toBeUndefined();
    });

    it('logout 仅清自己的 refresh,不影响其他 admin', async () => {
      // 两个 admin 各自 login(super_admin + 把 auditor1 临时设为 active)
      admins[1]!.status = 'active';
      const r1 = await svc.login({
        username: 'super_admin',
        password: 'O2o@2026-Admin',
        captcha: 'dev',
        captchaId: 'any',
      });
      const r2 = await svc.login({
        username: 'auditor1',
        password: 'AuditorPwd1',
        captcha: 'dev',
        captchaId: 'any',
      });
      void r1;
      // 仅 logout 40002
      await svc.logout('40002', 'jti-auditor', Math.floor(Date.now() / 1000) + 7200);
      // r1 的 refresh 仍能用
      await expect(svc.refresh(r1.refreshToken)).resolves.toMatchObject({ adminToken: 'admin-token-mock' });
      // r2 的 refresh 已失效
      await expect(svc.refresh(r2.refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
