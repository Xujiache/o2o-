/**
 * HTTP Header 常量 — 4 端 Token 严格隔离,跨端调用必须返回 FORBIDDEN
 * 来源:`项目阶段规划/全局接口契约规范.md`
 */
export const Header = {
  /** 用户端 Token */
  CustomerToken: 'Customer-Token',
  /** 商家端 APP Token */
  MerchantToken: 'Merchant-Token',
  /** 骑手端 APP Token */
  RiderToken: 'Rider-Token',
  /** 平台 Web Token */
  AdminToken: 'Admin-Token',
  /** 链路 ID */
  TraceId: 'X-Trace-Id',
  /** 幂等 Key(写接口必带) */
  IdempotencyKey: 'Idempotency-Key',
  /** 设备 ID(用于审计) */
  DeviceId: 'X-Device-Id',
  /** 客户端版本(用于审计/兼容) */
  ClientVersion: 'X-Client-Version',
} as const;

/** 端类型 → Token Header 名称映射 */
export type Scope = 'customer' | 'merchant' | 'rider' | 'admin';

export const ScopeTokenHeader: Record<Scope, string> = {
  customer: Header.CustomerToken,
  merchant: Header.MerchantToken,
  rider: Header.RiderToken,
  admin: Header.AdminToken,
};

/** 路径前缀 */
export const PathPrefix = {
  customer: '/api/v1/c',
  merchant: '/api/v1/m',
  rider: '/api/v1/r',
  admin: '/api/v1/admin',
  public: '/api/v1/pub',
  callback: '/api/v1/callback',
} as const;
