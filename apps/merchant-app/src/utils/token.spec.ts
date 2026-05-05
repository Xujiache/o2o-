import { beforeEach, describe, expect, it } from 'vitest';

import { clearToken, getToken, setToken } from './token';

describe('merchant-app utils/token', () => {
  beforeEach(() => {
    const u = (globalThis as unknown as { uni: { removeStorageSync: (k: string) => void } }).uni;
    u.removeStorageSync('o2o:merchant:token');
    u.removeStorageSync('o2o:merchant:principal');
  });

  it('set/get/clear token 闭环', () => {
    setToken('mer-token-x');
    expect(getToken()).toBe('mer-token-x');
    clearToken();
    expect(getToken()).toBe(null);
  });

  it('未设置时返回 null', () => {
    expect(getToken()).toBe(null);
  });
});
