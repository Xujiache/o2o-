import type { Scope } from '@o2o/contracts';

/** 4 端 JWT Payload(端隔离;每个 scope 用独立 secret 签名) */
export interface JwtPayload {
  /** 主体 ID — 用户 ID / 商家 ID / 骑手 ID / 管理员 ID(字符串避免大整数精度) */
  sub: string;
  /** 主体归属端 */
  scope: Scope;
  /** 用户拥有的角色 codes(用于 PermissionGuard 查询权限) */
  roles: string[];
  /** Token 唯一标识(便于注销/审计) */
  jti?: string;
  iat?: number;
  exp?: number;
}

/** 当前请求主体(Guard 通过后填充) */
export interface CurrentPrincipal {
  scope: Scope;
  principalId: string;
  roles: string[];
}
