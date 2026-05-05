import { describe, expect, it } from 'vitest';

import { formatYuan } from './format-price';

describe('formatYuan', () => {
  it('整数分 → 元保留 2 位小数', () => {
    expect(formatYuan(5900)).toBe('59.00');
    expect(formatYuan('5900')).toBe('59.00');
  });
  it('零', () => {
    expect(formatYuan(0)).toBe('0.00');
  });
  it('小额 1 分', () => {
    expect(formatYuan(1)).toBe('0.01');
  });
  it('非有限数返回 0.00', () => {
    expect(formatYuan('abc')).toBe('0.00');
  });
});
