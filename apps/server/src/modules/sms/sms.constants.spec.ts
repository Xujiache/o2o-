import {
  RATE_KEY,
  RATE_IP_PER_MINUTE,
  RATE_MOBILE_PER_DAY,
  RATE_MOBILE_PER_MINUTE,
  SMS_CODE_LENGTH,
  SMS_CODE_TTL_MINUTES,
  SMS_CODE_TTL_SECONDS,
  SMS_SCENES,
} from './sms.constants';

describe('sms.constants', () => {
  it('限频常量按 DESIGN § 6 表', () => {
    expect(RATE_MOBILE_PER_MINUTE).toEqual({ window: 60, max: 1 });
    expect(RATE_IP_PER_MINUTE).toEqual({ window: 60, max: 5 });
    expect(RATE_MOBILE_PER_DAY).toEqual({ window: 86400, max: 10 });
  });

  it('验证码长度 6 位,5 分钟过期', () => {
    expect(SMS_CODE_LENGTH).toBe(6);
    expect(SMS_CODE_TTL_MINUTES).toBe(5);
    expect(SMS_CODE_TTL_SECONDS).toBe(300);
  });

  it('SMS_SCENES 枚举包含 4 个场景', () => {
    expect(SMS_SCENES).toEqual(['login', 'realname', 'change-mobile', 'sensitive']);
  });

  it('Redis key 按 mobile/IP/scene 分桶', () => {
    expect(RATE_KEY.mobilePerMinute('13800000001')).toBe('sms:limit:mobile:13800000001:60s');
    expect(RATE_KEY.ipPerMinute('1.2.3.4')).toBe('sms:limit:ip:1.2.3.4:60s');
    expect(RATE_KEY.mobilePerDay('13800000001')).toBe('sms:limit:mobile:13800000001:day');
  });
});
