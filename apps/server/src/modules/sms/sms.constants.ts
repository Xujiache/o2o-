/**
 * SMS 模块常量 — 限频窗口、Redis key 前缀、验证码格式。
 * 来源:DESIGN_阶段1.md § 6 异常处理 + § 4.1 sms-code 接口契约。
 */

export const SMS_SCENES = ['login', 'realname', 'change-mobile', 'sensitive'] as const;
export type SmsScene = (typeof SMS_SCENES)[number];

export const SMS_CODE_LENGTH = 6;
export const SMS_CODE_TTL_MINUTES = 5;
export const SMS_CODE_TTL_SECONDS = SMS_CODE_TTL_MINUTES * 60;

/** 限频窗口 — 同手机号 60s 最多 1 条 */
export const RATE_MOBILE_PER_MINUTE = { window: 60, max: 1 };
/** 限频窗口 — 同 IP 60s 最多 5 条 */
export const RATE_IP_PER_MINUTE = { window: 60, max: 5 };
/** 限频窗口 — 同手机号 24h 最多 10 条 */
export const RATE_MOBILE_PER_DAY = { window: 86400, max: 10 };

/** Redis key 前缀(集中管理避免散落) */
export const RATE_KEY = {
  mobilePerMinute: (mobile: string): string => `sms:limit:mobile:${mobile}:60s`,
  ipPerMinute: (ip: string): string => `sms:limit:ip:${ip}:60s`,
  mobilePerDay: (mobile: string): string => `sms:limit:mobile:${mobile}:day`,
};

/** 幂等 scope */
export const SMS_IDEMPOTENT_SCOPE = 'sms:send-code';
