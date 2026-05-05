/**
 * Stage 3 端隔离 e2e — 验证 customer/merchant/admin Token 不能调 /r/* 接口,
 * 以及 rider Token 不能调 /c/* / /m/* / /admin/*。
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
  } as unknown as Parameters<RiderJwtGuard['canActivate']>[0];
}

describe('Stage 3 端隔离', () => {
  let auth: AuthService;
  let riderGuard: RiderJwtGuard;
  let merchantGuard: MerchantJwtGuard;
  let customerGuard: CustomerJwtGuard;
  let adminGuard: AdminJwtGuard;
  let riderToken: string;
  let customerToken: string;
  let merchantToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'fallback' })],
      providers: [
        AuthService,
        { provide: ConfigService, useValue: config },
        Reflector,
        RiderJwtGuard,
        MerchantJwtGuard,
        CustomerJwtGuard,
        AdminJwtGuard,
      ],
    }).compile();
    auth = moduleRef.get(AuthService);
    riderGuard = moduleRef.get(RiderJwtGuard);
    merchantGuard = moduleRef.get(MerchantJwtGuard);
    customerGuard = moduleRef.get(CustomerJwtGuard);
    adminGuard = moduleRef.get(AdminJwtGuard);
    riderToken = auth.signAccessToken('rider', 'r-1', ['RIDER']);
    customerToken = auth.signAccessToken('customer', 'u-1', ['CUSTOMER']);
    merchantToken = auth.signAccessToken('merchant', 'm-1', ['MERCHANT']);
    adminToken = auth.signAccessToken('admin', 'a-1', ['SUPER_ADMIN']);
  });

  it('Rider-Token 调 /r/* 接口 → 通过 + scope=rider', () => {
    const ctx = mockExecCtx({ 'rider-token': riderToken });
    expect(riderGuard.canActivate(ctx)).toBe(true);
    const req = (
      ctx as unknown as {
        switchToHttp: () => { getRequest: () => { user?: { scope: string; principalId: string } } };
      }
    )
      .switchToHttp()
      .getRequest();
    expect(req.user?.scope).toBe('rider');
    expect(req.user?.principalId).toBe('r-1');
  });

  it('Customer-Token 调 /r/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'customer-token': customerToken });
    expect(() => riderGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Merchant-Token 调 /r/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'merchant-token': merchantToken });
    expect(() => riderGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Admin-Token 调 /r/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'admin-token': adminToken });
    expect(() => riderGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Rider-Token 调 /c/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'rider-token': riderToken });
    expect(() => customerGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Rider-Token 调 /m/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'rider-token': riderToken });
    expect(() => merchantGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('Rider-Token 调 /admin/* → FORBIDDEN', () => {
    const ctx = mockExecCtx({ 'rider-token': riderToken });
    expect(() => adminGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('完全无 Token 调 /r/* → UNAUTHORIZED', () => {
    const ctx = mockExecCtx({});
    expect(() => riderGuard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
