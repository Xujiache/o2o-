/** 解析 JWT 字符串 TTL("2h" / "30d" / "300s") → 秒数。与 customer-auth 同款。 */
export function parseTtlToSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m || !m[1] || !m[2]) return 0;
  const n = Number(m[1]);
  switch (m[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 0;
  }
}

export const REFRESH_TOKEN_BYTES = 32;
/** Redis key:商家 refresh hash → { merchantId, deviceId } */
export const MERCHANT_REFRESH_PREFIX = 'merchant:refresh:';

export const MERCHANT_AUTH_IDEMPOTENT_SCOPE = {
  login: 'merchant-auth:login',
  refresh: 'merchant-auth:refresh',
  logout: 'merchant-auth:logout',
} as const;
