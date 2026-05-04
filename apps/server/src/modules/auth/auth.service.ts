import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Scope } from '@o2o/contracts';
import { nanoid } from 'nanoid';

import type { AppConfig } from '../../config/configuration';

import type { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** 签发 access token(stage 0 暂不持久化 jti) */
  signAccessToken(scope: Scope, principalId: string, roles: string[]): string {
    const secret = this.getSecret(scope);
    const ttl = this.config.get<AppConfig['jwt']>('jwt')?.accessTtl ?? '2h';
    return this.jwt.sign({ sub: principalId, scope, roles, jti: nanoid(10) }, { secret, expiresIn: ttl });
  }

  /** 验证 token,签名失败抛 UnauthorizedException */
  verify(token: string, scope: Scope): JwtPayload {
    const secret = this.getSecret(scope);
    try {
      return this.jwt.verify<JwtPayload>(token, { secret });
    } catch (err) {
      throw new UnauthorizedException(err instanceof Error ? err.message : 'invalid token');
    }
  }

  private getSecret(scope: Scope): string {
    const jwt = this.config.get<AppConfig['jwt']>('jwt');
    if (!jwt) throw new Error('jwt config missing');
    switch (scope) {
      case 'customer':
        return jwt.customerSecret;
      case 'merchant':
        return jwt.merchantSecret;
      case 'rider':
        return jwt.riderSecret;
      case 'admin':
        return jwt.adminSecret;
    }
  }
}
