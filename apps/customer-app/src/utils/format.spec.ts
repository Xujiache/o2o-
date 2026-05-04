/** customer-app smoke test:验证 utils/format 与 token 在 vitest + node 环境可用 */
import { describe, expect, it } from 'vitest';

import { formatAmountFen, formatDistanceMeters, formatTimestamp, maskPhone } from './format';
import { clearToken, getToken, setToken } from './token';

describe('customer-app/utils/format', () => {
  it('formatAmountFen 把分→元 (两位小数)', () => {
    expect(formatAmountFen(1234)).toBe('12.34');
    expect(formatAmountFen('5000')).toBe('50.00');
    expect(formatAmountFen(null)).toBe('0.00');
  });

  it('formatDistanceMeters 自动切换 m/km', () => {
    expect(formatDistanceMeters(500)).toBe('500m');
    expect(formatDistanceMeters(1500)).toBe('1.5km');
    expect(formatDistanceMeters(null)).toBe('-');
  });

  it('maskPhone 中间 4 位脱敏', () => {
    expect(maskPhone('13800138000')).toBe('138****8000');
    expect(maskPhone('')).toBe('');
  });

  it('formatTimestamp 返回 yyyy-MM-dd HH:mm', () => {
    expect(formatTimestamp(0)).toBe('-');
    expect(formatTimestamp(1700000000000)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('customer-app/utils/token', () => {
  it('set/get/clear token 闭环(内存 mock)', () => {
    setToken('abc');
    expect(getToken()).toBe('abc');
    clearToken();
    expect(getToken()).toBe(null);
  });
});
