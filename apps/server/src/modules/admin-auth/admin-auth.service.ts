import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@o2o/contracts';
import type Redis from 'ioredis';
import * as svgCaptcha from 'svg-captcha';
import { Repository } from 'typeorm';

import { verifyPassword } from '../../common/utils/password.util';
import type { AppConfig } from '../../config/configuration';
import { REDIS_CLIENT } from '../../config/redis.module';
import { AdminUser, SysPermission, SysRole, SysRolePermission } from '../../database/entities';
import { DomainEventBus } from '../../events/domain-event-bus';
import { EventName } from '../../events/events';
import { AuthService } from '../auth/auth.service';
import { JTI_REVOKED_PREFIX } from '../auth/guards/scope-jwt.guard';

import {
  ADMIN_CAPTCHA_PREFIX,
  ADMIN_REFRESH_PREFIX,
  CAPTCHA_DEV_BYPASS,
  CAPTCHA_TTL_SECONDS,
  LOGIN_FAIL_LOCK_MINUTES,
  LOGIN_FAIL_LOCK_THRESHOLD,
  REFRESH_TOKEN_BYTES,
  parseTtlToSeconds,
} from './admin-auth.constants';
import type { CaptchaResponseVo, AdminLoginVo, AdminRefreshVo } from './admin-auth.dto';

interface RefreshRecord {
  adminUserId: string;
  deviceId: string | null;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    @InjectRepository(AdminUser) private readonly adminRepo: Repository<AdminUser>,
    @InjectRepository(SysRole) private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission) private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission) private readonly rpRepo: Repository<SysRolePermission>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly eventBus: DomainEventBus,
  ) {}

  /** 生成 svg captcha → Redis 缓存 → 返 svgImage */
  async createCaptcha(): Promise<CaptchaResponseVo> {
    const cap = svgCaptcha.create({
      size: 4,
      noise: 2,
      ignoreChars: '0o1lI',
      color: true,
      background: '#f6f6f6',
    });
    const captchaId = randomUUID();
    await this.redis.set(`${ADMIN_CAPTCHA_PREFIX}${captchaId}`, cap.text.toLowerCase(), 'EX', CAPTCHA_TTL_SECONDS);
    return { captchaId, svgImage: cap.data };
  }

  async login(input: {
    username: string;
    password: string;
    captcha: string;
    captchaId: string;
    deviceId?: string;
    ip?: string | null;
  }): Promise<AdminLoginVo> {
    await this.verifyCaptcha(input.captcha, input.captchaId);

    const admin = await this.adminRepo.findOne({ where: { username: input.username } });
    if (!admin) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: '用户名或密码错误' });
    }
    if (admin.status === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号已禁用',
      });
    }
    const now = Date.now();
    const lockedUntil = Number(admin.lockedUntil ?? '0');
    if (lockedUntil > now) {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: `账号已锁定,${Math.ceil((lockedUntil - now) / 60000)} 分钟后再试`,
      });
    }

    if (!verifyPassword(input.password, admin.passwordHash)) {
      const failed = (admin.loginFailedCount ?? 0) + 1;
      const updates: Partial<AdminUser> = {
        loginFailedCount: failed,
        updatedAt: now.toString(),
      };
      if (failed >= LOGIN_FAIL_LOCK_THRESHOLD) {
        updates.lockedUntil = (now + LOGIN_FAIL_LOCK_MINUTES * 60 * 1000).toString();
        updates.loginFailedCount = 0; // reset 计数,锁定窗口走完后重新计
      }
      await this.adminRepo.update({ adminUserId: admin.adminUserId }, updates);
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: '用户名或密码错误' });
    }

    const previousLoginAt = Number(admin.lastLoginAt ?? '0');
    await this.adminRepo.update(
      { adminUserId: admin.adminUserId },
      {
        loginFailedCount: 0,
        lockedUntil: '0',
        lastLoginAt: now.toString(),
        updatedAt: now.toString(),
      },
    );

    // 角色 → 权限聚合
    const { permissions, menus } = await this.aggregatePermissions(admin.roleCodes ?? []);

    const accessToken = this.authService.signAccessToken('admin', admin.adminUserId, admin.roleCodes ?? []);
    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshHash = this.hashRefresh(refreshToken);
    await this.storeRefresh(refreshHash, admin.adminUserId, input.deviceId ?? null);

    await this.eventBus.publish(
      EventName.AdminLoggedIn,
      {
        adminUserId: admin.adminUserId,
        username: admin.username,
        loggedInAt: now,
        ip: input.ip ?? undefined,
        deviceId: input.deviceId ?? undefined,
      },
      { bizType: 'admin-auth', bizId: admin.adminUserId },
    );

    return {
      adminUserId: admin.adminUserId,
      username: admin.username,
      displayName: admin.displayName ?? admin.username,
      adminToken: accessToken,
      refreshToken,
      roleCodes: admin.roleCodes ?? [],
      permissions,
      menus,
      lastLoginAt: previousLoginAt,
    };
  }

  async refresh(refreshToken: string, deviceId?: string): Promise<AdminRefreshVo> {
    const oldHash = this.hashRefresh(refreshToken);
    const record = await this.loadRefresh(oldHash);
    if (!record) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'refresh 失效' });
    }
    if (deviceId && record.deviceId && record.deviceId !== deviceId) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: 'device 不匹配' });
    }
    const admin = await this.adminRepo.findOne({ where: { adminUserId: record.adminUserId } });
    if (!admin || admin.status === 'disabled') {
      throw new UnprocessableEntityException({
        code: ErrorCode.STATUS_INVALID,
        message: '账号不可用',
      });
    }
    await this.redis.del(`${ADMIN_REFRESH_PREFIX}${oldHash}`).catch(() => undefined);
    const accessToken = this.authService.signAccessToken('admin', admin.adminUserId, admin.roleCodes ?? []);
    const newRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const newHash = this.hashRefresh(newRefresh);
    await this.storeRefresh(newHash, admin.adminUserId, deviceId ?? record.deviceId ?? null);
    return { adminToken: accessToken, refreshToken: newRefresh };
  }

  async logout(adminUserId: string, jti: string | null, exp: number | null): Promise<void> {
    // 删除该 admin 全部 refresh
    const pattern = `${ADMIN_REFRESH_PREFIX}*`;
    let cursor = '0';
    do {
      const [next, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      for (const k of keys) {
        const v = await this.redis.get(k);
        if (!v) continue;
        try {
          const r = JSON.parse(v) as RefreshRecord;
          if (r.adminUserId === adminUserId) {
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

  private async verifyCaptcha(text: string, captchaId: string): Promise<void> {
    const isMockMode = (this.config.get<AppConfig['integration']>('integration')?.mode ?? 'mock') === 'mock';
    if (isMockMode && text === CAPTCHA_DEV_BYPASS) return;

    const key = `${ADMIN_CAPTCHA_PREFIX}${captchaId}`;
    const expected = await this.redis.get(key);
    if (!expected) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: '验证码已过期' });
    }
    // 一次性 — 取出立刻删
    await this.redis.del(key).catch(() => undefined);
    if (expected !== text.toLowerCase()) {
      throw new UnauthorizedException({ code: ErrorCode.UNAUTHORIZED, message: '验证码错误' });
    }
  }

  private async aggregatePermissions(roleCodes: string[]): Promise<{ permissions: string[]; menus: string[] }> {
    if (!roleCodes.length) return { permissions: [], menus: [] };
    const roles = await this.roleRepo
      .createQueryBuilder('r')
      .where('r.code IN (:...codes)', { codes: roleCodes })
      .getMany();
    const roleIds = roles.map((r) => r.id);
    if (!roleIds.length) return { permissions: [], menus: [] };
    const bindings = await this.rpRepo
      .createQueryBuilder('rp')
      .where('rp.role_id IN (:...ids)', { ids: roleIds })
      .getMany();
    const permIds = Array.from(new Set(bindings.map((b) => b.permissionId)));
    if (!permIds.length) return { permissions: [], menus: [] };
    const perms = await this.permRepo.createQueryBuilder('p').where('p.id IN (:...ids)', { ids: permIds }).getMany();
    const permissions: string[] = [];
    const menus: string[] = [];
    for (const p of perms) {
      permissions.push(p.code);
      if (p.type === 'menu') menus.push(p.code);
    }
    return { permissions, menus };
  }

  private hashRefresh(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async storeRefresh(refreshHash: string, adminUserId: string, deviceId: string | null): Promise<void> {
    const ttl = parseTtlToSeconds(this.refreshTtl());
    const record: RefreshRecord = { adminUserId, deviceId };
    await this.redis.set(`${ADMIN_REFRESH_PREFIX}${refreshHash}`, JSON.stringify(record), 'EX', ttl);
  }

  private async loadRefresh(refreshHash: string): Promise<RefreshRecord | null> {
    const v = await this.redis.get(`${ADMIN_REFRESH_PREFIX}${refreshHash}`);
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
    return this.config.get<AppConfig['jwt']>('jwt')?.refreshTtl ?? '7d';
  }
}
