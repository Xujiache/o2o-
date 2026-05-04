import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthService } from './auth.service';

describe('AuthService — 4 端 secret 隔离', () => {
  let service: AuthService;

  const config = {
    get: (key: string) => {
      if (key === 'jwt') {
        return {
          customerSecret: 'customer-secret',
          merchantSecret: 'merchant-secret',
          riderSecret: 'rider-secret',
          adminSecret: 'admin-secret',
          accessTtl: '2h',
          refreshTtl: '30d',
        };
      }
      return undefined;
    },
  } as unknown as ConfigService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'fallback' })],
      providers: [AuthService, { provide: ConfigService, useValue: config }],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('issues a token and verifies it with the same scope', () => {
    const token = service.signAccessToken('customer', 'u-1', ['CUSTOMER']);
    const payload = service.verify(token, 'customer');
    expect(payload.sub).toBe('u-1');
    expect(payload.scope).toBe('customer');
    expect(payload.roles).toEqual(['CUSTOMER']);
  });

  it('rejects a customer token verified with admin secret', () => {
    const token = service.signAccessToken('customer', 'u-1', ['CUSTOMER']);
    expect(() => service.verify(token, 'admin')).toThrow();
  });

  it('rejects a forged token (wrong signature)', () => {
    const validJwt = new JwtService({ secret: 'wrong-secret' });
    const forged = validJwt.sign({ sub: 'evil', scope: 'admin', roles: ['SUPER_ADMIN'] });
    expect(() => service.verify(forged, 'admin')).toThrow();
  });

  it('produces 4 distinct tokens for 4 scopes(端隔离)', () => {
    const tokens = (['customer', 'merchant', 'rider', 'admin'] as const).map((s) =>
      service.signAccessToken(s, 'u', ['ROLE']),
    );
    const set = new Set(tokens);
    expect(set.size).toBe(4);
  });
});
