import { describe, expect, it } from 'vitest';

import { setRefreshHandler } from './request';

describe('rider-app request 工具', () => {
  it('setRefreshHandler 接受函数 + null,不抛错', () => {
    expect(() => setRefreshHandler(() => Promise.resolve(true))).not.toThrow();
    expect(() => setRefreshHandler(null)).not.toThrow();
  });

  it('setRefreshHandler 设为 null 后不影响后续设置', () => {
    setRefreshHandler(null);
    setRefreshHandler(() => Promise.resolve(false));
    setRefreshHandler(null);
    expect(true).toBe(true);
  });
});
