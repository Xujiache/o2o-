/** MobileInput 校验逻辑冒烟(纯 regex,不挂 DOM) */
import { describe, expect, it } from 'vitest';

const MOBILE = /^1[3-9]\d{9}$/;

describe('MobileInput valid 校验', () => {
  it('合法手机号', () => {
    expect(MOBILE.test('13900000001')).toBe(true);
    expect(MOBILE.test('19999999999')).toBe(true);
  });
  it('非法手机号', () => {
    expect(MOBILE.test('12345678901')).toBe(false);
    expect(MOBILE.test('1390000')).toBe(false);
    expect(MOBILE.test('22388888888')).toBe(false);
  });
  it('数字过滤(仿组件 input 处理)', () => {
    expect('1ab39000abc1xx'.replace(/\D/g, '').slice(0, 11)).toBe('1390001');
  });
  it('11+ 位截断', () => {
    expect('139000000019999'.replace(/\D/g, '').slice(0, 11)).toBe('13900000001');
  });
});
