/** 解析 JWT 字符串 TTL("2h" / "30d" / "300s") → 秒数。与 customer-auth/merchant-auth 同款。 */
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
/** Redis key:骑手 refresh hash → { riderId, deviceId } */
export const RIDER_REFRESH_PREFIX = 'rider:refresh:';

export const RIDER_AUTH_IDEMPOTENT_SCOPE = {
  login: 'rider-auth:login',
  refresh: 'rider-auth:refresh',
  logout: 'rider-auth:logout',
} as const;
