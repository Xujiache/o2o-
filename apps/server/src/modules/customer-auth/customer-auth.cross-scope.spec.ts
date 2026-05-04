/**
 * 端隔离 e2e — 验证 customer-Token 不能调 admin 接口、admin-Token 不能调 c 接口。
 *
 * 用 NestJS Test.createTestingModule 加载真实的 ScopeJwtGuard 实例,
 * 但所有数据库 / Redis / 第三方依赖均替换为内存桩,聚焦守卫层鉴权拦截。
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { AdminJwtGuard, CustomerJwtGuard } from '../auth/guards/scope-jwt.guard';

const SECRETS = {
  customerSecret: 'cs',
  merchantSecret: 'ms',
  riderSecret: 'rs',
  adminSecret: 'as',
  accessTtl: '2h',
  refreshTtl: '30d',
};

const config = {
  get: (key: string) => (key === 'jwt' ? SECRETS : undefined),
} as unknown as ConfigService;

function mockExecCtx(headers: Record<string, string>) {
  const req = { headers, user: undefined } as unknown;
  const dummy = function (): void {};
  class DummyClass {}
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => dummy,
    getClass: () => DummyClass,
  } as unknown as Parameters<CustomerJwtGuard['canActivate']>[0];
}

describe('Stage 1 端隔离', () => {
  let auth: AuthService;
  let customerGuard: CustomerJwtGuard;
  let adminGuard: AdminJwtGuard;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'fallback' })],
      providers: [
        AuthService,
        { provide: ConfigService, useValue: config },
        Reflector,
        CustomerJwtGuard,
        AdminJwtGuard,
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
    customerGuard = moduleRef.get(CustomerJwtGuard);
    adminGuard = moduleRef.get(AdminJwtGuard);
    customerToken = auth.signAccessToken('customer', 'u-1', ['CUSTOMER']);
    adminToken = auth.signAccessToken('admin', 'a-1', ['SUPER_ADMIN']);
  });

  it('Customer-Token 调 admin 接口 → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'customer-token': customerToken });
    expect(() => adminGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 c/auth/logout(CustomerJwtGuard)→ FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => customerGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('完全无 Token 调 c/auth/logout → UNAUTHORIZED', () => {
    const ctx = mockExecCtx({});
    expect(() => customerGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('完全无 Token 调 admin/customers → UNAUTHORIZED', () => {
    const ctx = mockExecCtx({});
    expect(() => adminGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('Customer-Token 调 c/auth/logout → 通过 + 设置 req.user.scope=customer', () => {
    const ctx = mockExecCtx({ 'customer-token': customerToken });
    const result = customerGuard.canActivate(ctx);
    expect(result).toBe(true);
    const req = (
      ctx as unknown as { switchToHttp: () => { getRequest: () => { user?: { scope: string; jti?: string } } } }
    )
      .switchToHttp()
      .getRequest();
    expect(req.user?.scope).toBe('customer');
    expect(req.user?.jti).toBeTruthy();
  });

  it('Admin-Token 调 admin/customers → 通过 + 设置 req.user.scope=admin', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    const result = adminGuard.canActivate(ctx);
    expect(result).toBe(true);
    const req = (ctx as unknown as { switchToHttp: () => { getRequest: () => { user?: { scope: string } } } })
      .switchToHttp()
      .getRequest();
    expect(req.user?.scope).toBe('admin');
  });

  it('伪造 jwt(错的 secret 签的 token)→ UNAUTHORIZED', () => {
    const fakeToken = auth.signAccessToken('customer', 'u-attack', ['CUSTOMER']);
    // 篡改最后一段(签名)
    const tampered = fakeToken.split('.').slice(0, 2).concat('xxxxxx').join('.');
    const ctx = mockExecCtx({ 'customer-token': tampered });
    expect(() => customerGuard.canActivate(ctx)).toThrow();
  });
});
