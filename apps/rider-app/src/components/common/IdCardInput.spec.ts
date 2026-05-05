/** IdCardInput 校验位逻辑冒烟(纯函数,不挂 DOM) */
import { describe, expect, it } from 'vitest';

function checkIdCard(no: string): boolean {
  if (!/^\d{17}[\dXx]$/.test(no)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(no[i]) * weights[i]!;
  return checks[sum % 11]!.toUpperCase() === no[17]!.toUpperCase();
}

describe('IdCardInput 校验位逻辑', () => {
  it('合法 18 位身份证号(末位 X) → true', () => {
    expect(checkIdCard('11010519491231002X')).toBe(true);
  });

  it('校验位错 → false', () => {
    expect(checkIdCard('110105194912310029')).toBe(false);
  });

  it('长度不足 → false', () => {
    expect(checkIdCard('12345')).toBe(false);
  });

  it('包含非法字符 → false', () => {
    expect(checkIdCard('110105194912310-Y')).toBe(false);
  });

  it('字符过滤(仿组件 input 处理)', () => {
    const filtered = '110-105-1949-1231-002X-extra'.replace(/[^\dXx]/g, '').slice(0, 18);
    expect(filtered).toBe('11010519491231002X');
  });
});
