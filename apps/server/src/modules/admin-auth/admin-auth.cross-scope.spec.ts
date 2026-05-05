/**
 * Stage 4 端隔离 — 验证 admin-Token 不能调 c/m/r 接口、c/m/r-Token 不能调 admin 接口。
 * 以 ScopeJwtGuard 为切入点,所有依赖均 mock。
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { AdminJwtGuard, CustomerJwtGuard, MerchantJwtGuard, RiderJwtGuard } from '../auth/guards/scope-jwt.guard';

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
  } as unknown as Parameters<AdminJwtGuard['canActivate']>[0];
}

describe('Stage 4 端隔离 — admin → c/m/r', () => {
  let auth: AuthService;
  let customerGuard: CustomerJwtGuard;
  let merchantGuard: MerchantJwtGuard;
  let riderGuard: RiderJwtGuard;
  let adminGuard: AdminJwtGuard;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'fallback' })],
      providers: [
        AuthService,
        { provide: ConfigService, useValue: config },
        Reflector,
        CustomerJwtGuard,
        MerchantJwtGuard,
        RiderJwtGuard,
        AdminJwtGuard,
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
    customerGuard = moduleRef.get(CustomerJwtGuard);
    merchantGuard = moduleRef.get(MerchantJwtGuard);
    riderGuard = moduleRef.get(RiderJwtGuard);
    adminGuard = moduleRef.get(AdminJwtGuard);
    adminToken = auth.signAccessToken('admin', 'a-1', ['SUPER_ADMIN']);
  });

  it('Admin-Token 调 customer 接口 → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => customerGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 merchant 接口 → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => merchantGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 rider 接口 → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => riderGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 admin 接口 → 通过 + scope=admin', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    const result = adminGuard.canActivate(ctx);
    expect(result).toBe(true);
    const req = (ctx as unknown as { switchToHttp: () => { getRequest: () => { user?: { scope: string } } } })
      .switchToHttp()
      .getRequest();
    expect(req.user?.scope).toBe('admin');
  });

  it('伪造 admin token(篡改签名)→ UNAUTHORIZED', () => {
    const tampered = adminToken.split('.').slice(0, 2).concat('xxxxxx').join('.');
    const ctx = mockExecCtx({ 'admin-token': tampered });
    expect(() => adminGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
