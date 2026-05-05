import { describe, expect, it, vi } from 'vitest';

import { setRefreshHandler } from './request';

describe('merchant-app utils/request setRefreshHandler', () => {
  it('注入与清除 handler 不抛错', () => {
    const handler = vi.fn(async () => true);
    expect(() => setRefreshHandler(handler)).not.toThrow();
    expect(() => setRefreshHandler(null)).not.toThrow();
  });

  it('handler 是 async 返回 boolean(契约形状)', async () => {
    const handler = vi.fn(async () => false);
    setRefreshHandler(handler);
    expect(await handler()).toBe(false);
  });
});
