import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Header, type Scope, ScopeTokenHeader } from '@o2o/contracts';
import type { Request } from 'express';
import type Redis from 'ioredis';

import { IS_PUBLIC } from '../../../common/decorators/public.decorator';
import { setCtxField } from '../../../common/utils/als';
import { REDIS_CLIENT } from '../../../config/redis.module';
import { AuthService } from '../auth.service';
import type { CurrentPrincipal, JwtPayload } from '../types';

/** Redis key 前缀:已注销/吊销的 jti(TTL=accessToken 剩余) */
export const JTI_REVOKED_PREFIX = 'jti:revoked:';

const ALL_SCOPES: Scope[] = ['customer', 'merchant', 'rider', 'admin'];

/**
 * 4 端 JWT 守卫基类。
 * - 读对应 scope 的 header(Customer-Token / Merchant-Token / ...)
 * - 4 个 secret 独立签名,签名错误 → UNAUTHORIZED
 * - 跨端 Token(发了别的 scope 的 header)→ FORBIDDEN
 * - 完全无 Token → UNAUTHORIZED(@Public 路由跳过)
 */
@Injectable()
export abstract class ScopeJwtGuard implements CanActivate {
  abstract readonly scope: Scope;

  constructor(
    protected readonly reflector: Reflector,
    protected readonly authService: AuthService,
    @Optional() @Inject(REDIS_CLIENT) protected readonly redis?: Redis,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const myHeader = ScopeTokenHeader[this.scope].toLowerCase();
    const myToken = (req.headers[myHeader] as string | undefined) ?? '';

    if (!myToken) {
      const otherHeaderPresent = ALL_SCOPES.filter((s) => s !== this.scope).some((s) => {
        const h = ScopeTokenHeader[s].toLowerCase();
        return Boolean(req.headers[h]);
      });
      if (otherHeaderPresent) {
        throw new ForbiddenException('cross-scope token');
      }
      throw new UnauthorizedException('token missing');
    }

    const payload = this.authService.verify(myToken, this.scope);
    if (payload.scope !== this.scope) {
      throw new ForbiddenException('token scope mismatch');
    }

    return this.applyPayload(req, payload);
  }

  protected applyPayload(req: Request, payload: JwtPayload): boolean | Promise<boolean> {
    if (payload.jti && this.redis) {
      return this.redis.exists(`${JTI_REVOKED_PREFIX}${payload.jti}`).then((revoked) => {
        if (revoked > 0) {
          throw new UnauthorizedException('token revoked');
        }
        this.setPrincipal(req, payload);
        return true;
      });
    }
    this.setPrincipal(req, payload);
    return true;
  }

  private setPrincipal(req: Request, payload: JwtPayload): void {
    const principal: CurrentPrincipal = {
      scope: this.scope,
      principalId: payload.sub,
      roles: payload.roles ?? [],
      jti: payload.jti,
      exp: payload.exp,
    };
    (req as Request & { user?: CurrentPrincipal }).user = principal;
    setCtxField('scope', this.scope);
    setCtxField('principalId', payload.sub);
  }
}

@Injectable()
export class CustomerJwtGuard extends ScopeJwtGuard {
  readonly scope: Scope = 'customer';
}

@Injectable()
export class MerchantJwtGuard extends ScopeJwtGuard {
  readonly scope: Scope = 'merchant';
}

@Injectable()
export class RiderJwtGuard extends ScopeJwtGuard {
  readonly scope: Scope = 'rider';
}

@Injectable()
export class AdminJwtGuard extends ScopeJwtGuard {
  readonly scope: Scope = 'admin';
}

/** 任一端 Token 均可通过(用于 /pub/files/upload 等多主体接口) */
@Injectable()
export class AnyScopeJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const presentScopes: Scope[] = [];
    let token = '';
    let chosen: Scope | null = null;
    for (const s of ALL_SCOPES) {
      const h = ScopeTokenHeader[s].toLowerCase();
      const v = req.headers[h];
      if (typeof v === 'string' && v) {
        presentScopes.push(s);
        token = v;
        chosen = s;
      }
    }
    if (presentScopes.length === 0) throw new UnauthorizedException('token missing');
    if (presentScopes.length > 1) throw new ForbiddenException('multiple scope tokens');
    if (!chosen) throw new UnauthorizedException();

    const payload = this.authService.verify(token, chosen);
    if (payload.scope !== chosen) throw new ForbiddenException('token scope mismatch');

    (req as Request & { user?: CurrentPrincipal }).user = {
      scope: chosen,
      principalId: payload.sub,
      roles: payload.roles ?? [],
    };
    setCtxField('scope', chosen);
    setCtxField('principalId', payload.sub);
    return true;
  }
}

/** 用于不便发 Header 的场景 — 仅 dev 用 */
export const SCOPE_HEADER_PARAM = Header.CustomerToken;
