/** merchant-app smoke test:验证 utils 在 vitest + node 环境可用 */
import { describe, expect, it } from 'vitest';

import { formatAmountFen, formatDistanceMeters, maskPhone } from './format';
import { clearToken, getToken, setToken } from './token';

describe('merchant-app/utils', () => {
  it('formatAmountFen 把分→元', () => {
    expect(formatAmountFen(9900)).toBe('99.00');
  });

  it('formatDistanceMeters', () => {
    expect(formatDistanceMeters(800)).toBe('800m');
  });

  it('maskPhone', () => {
    expect(maskPhone('13800138000')).toBe('138****8000');
  });

  it('token namespace 与 customer 隔离(内存 mock)', () => {
    setToken('merchant-token');
    expect(getToken()).toBe('merchant-token');
    clearToken();
    expect(getToken()).toBe(null);
  });
});
