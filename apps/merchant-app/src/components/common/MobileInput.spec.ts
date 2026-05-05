/** MobileInput 校验逻辑冒烟(纯 regex,不挂 DOM) */
import { describe, expect, it } from 'vitest';

const MOBILE = /^1[3-9]\d{9}$/;

describe('MobileInput valid 校验', () => {
  it('合法手机号', () => {
    expect(MOBILE.test('13800000001')).toBe(true);
    expect(MOBILE.test('19999999999')).toBe(true);
  });
  it('非法手机号', () => {
    expect(MOBILE.test('12345678901')).toBe(false);
    expect(MOBILE.test('1380000')).toBe(false);
    expect(MOBILE.test('22388888888')).toBe(false);
  });
});
