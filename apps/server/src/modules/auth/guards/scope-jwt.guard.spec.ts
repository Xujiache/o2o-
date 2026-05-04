import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from '../auth.service';

import { AdminJwtGuard, CustomerJwtGuard, MerchantJwtGuard, RiderJwtGuard, ScopeJwtGuard } from './scope-jwt.guard';

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
  const dummyHandler = function (): void {
    /* no-op */
  };
  class DummyClass {}
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => dummyHandler,
    getClass: () => DummyClass,
  } as unknown as Parameters<ScopeJwtGuard['canActivate']>[0];
}

describe('ScopeJwtGuard — 4×4 跨端隔离', () => {
  let auth: AuthService;
  let guards: Record<string, ScopeJwtGuard>;
  let tokens: Record<string, string>;

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
    guards = {
      customer: moduleRef.get(CustomerJwtGuard),
      merchant: moduleRef.get(MerchantJwtGuard),
      rider: moduleRef.get(RiderJwtGuard),
      admin: moduleRef.get(AdminJwtGuard),
    };
    tokens = {
      customer: auth.signAccessToken('customer', 'u-1', ['CUSTOMER']),
      merchant: auth.signAccessToken('merchant', 'm-1', ['MERCHANT']),
      rider: auth.signAccessToken('rider', 'r-1', ['RIDER']),
      admin: auth.signAccessToken('admin', 'a-1', ['SUPER_ADMIN']),
    };
  });

  const HEADER_OF: Record<string, string> = {
    customer: 'customer-token',
    merchant: 'merchant-token',
    rider: 'rider-token',
    admin: 'admin-token',
  };

  // 4 同 scope:通过
  it.each(['customer', 'merchant', 'rider', 'admin'])('%s token + %s guard 通过', (scope) => {
    const ctx = mockExecCtx({ [HEADER_OF[scope]!]: tokens[scope]! });
    expect(guards[scope]!.canActivate(ctx as any)).toBe(true);
  });

  // 4×3=12 跨 scope:拒绝(FORBIDDEN)
  const ALL = ['customer', 'merchant', 'rider', 'admin'] as const;
  for (const tokenScope of ALL) {
    for (const guardScope of ALL) {
      if (tokenScope === guardScope) continue;
      it(`${tokenScope} token 调 ${guardScope} guard → FORBIDDEN`, () => {
        const header = HEADER_OF[tokenScope]!;
        const ctx = mockExecCtx({ [header]: tokens[tokenScope]! });
        expect(() => guards[guardScope]!.canActivate(ctx as any)).toThrow(/cross-scope token/);
      });
    }
  }

  // 4 无 token:UNAUTHORIZED
  it.each(ALL)('%s guard 无 token → UNAUTHORIZED', (scope) => {
    const ctx = mockExecCtx({});
    expect(() => guards[scope]!.canActivate(ctx as any)).toThrow(/token missing/);
  });
});
