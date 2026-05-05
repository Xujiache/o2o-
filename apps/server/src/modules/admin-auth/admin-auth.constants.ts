/** Redis key 前缀 */
export const ADMIN_CAPTCHA_PREFIX = 'admin:captcha:';
export const ADMIN_REFRESH_PREFIX = 'admin:refresh:';

/** captcha TTL(秒)*/
export const CAPTCHA_TTL_SECONDS = 300;

/** 登录失败锁定阈值与时长 */
export const LOGIN_FAIL_LOCK_THRESHOLD = 5;
export const LOGIN_FAIL_LOCK_MINUTES = 30;

/** mock 模式 captcha 口令(便于 e2e/jest 测试) */
export const CAPTCHA_DEV_BYPASS = 'dev';

/** 幂等 scope */
export const ADMIN_AUTH_IDEMPOTENT_SCOPE = {
  login: 'admin-auth:login',
  refresh: 'admin-auth:refresh',
  logout: 'admin-auth:logout',
} as const;

export const REFRESH_TOKEN_BYTES = 32;

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
