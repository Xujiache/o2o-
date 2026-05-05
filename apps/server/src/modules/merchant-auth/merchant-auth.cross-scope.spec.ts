/**
 * Stage 2 端隔离 e2e — 验证 customer-Token / admin-Token 不能调 /m/* 接口。
 */
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from '../auth/auth.service';
import { AdminJwtGuard, CustomerJwtGuard, MerchantJwtGuard } from '../auth/guards/scope-jwt.guard';

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
  } as unknown as Parameters<MerchantJwtGuard['canActivate']>[0];
}

describe('Stage 2 端隔离', () => {
  let auth: AuthService;
  let merchantGuard: MerchantJwtGuard;
  let customerGuard: CustomerJwtGuard;
  let adminGuard: AdminJwtGuard;
  let merchantToken: string;
  let customerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'fallback' })],
      providers: [
        AuthService,
        { provide: ConfigService, useValue: config },
        Reflector,
        MerchantJwtGuard,
        CustomerJwtGuard,
        AdminJwtGuard,
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
    merchantGuard = moduleRef.get(MerchantJwtGuard);
    customerGuard = moduleRef.get(CustomerJwtGuard);
    adminGuard = moduleRef.get(AdminJwtGuard);
    merchantToken = auth.signAccessToken('merchant', 'm-1', ['MERCHANT']);
    customerToken = auth.signAccessToken('customer', 'u-1', ['CUSTOMER']);
    adminToken = auth.signAccessToken('admin', 'a-1', ['SUPER_ADMIN']);
  });

  it('Merchant-Token 调 /m/* 接口 → 通过 + scope=merchant', () => {
    const ctx = mockExecCtx({ 'merchant-token': merchantToken });
    expect(merchantGuard.canActivate(ctx)).toBe(true);
    const req = (
      ctx as unknown as {
        switchToHttp: () => { getRequest: () => { user?: { scope: string; principalId: string } } };
      }
    )
      .switchToHttp()
      .getRequest();
    expect(req.user?.scope).toBe('merchant');
    expect(req.user?.principalId).toBe('m-1');
  });

  it('Customer-Token 调 /m/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'customer-token': customerToken });
    expect(() => merchantGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 /m/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => merchantGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Merchant-Token 调 /admin/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'merchant-token': merchantToken });
    expect(() => adminGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Merchant-Token 调 /c/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'merchant-token': merchantToken });
    expect(() => customerGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('完全无 Token 调 /m/* → UNAUTHORIZED', () => {
    const ctx = mockExecCtx({});
    expect(() => merchantGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
