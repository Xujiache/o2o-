import { WxLoginMockAdapter, WxLoginRealAdapter } from './wxlogin.adapter';

describe('WxLoginMockAdapter', () => {
  const adapter = new WxLoginMockAdapter();

  it('jscode2session 返回稳定 openId(同 jsCode 同 openId)', async () => {
    const r1 = await adapter.jscode2session('test-code-001');
    const r2 = await adapter.jscode2session('test-code-001');
    expect(r1.openId).toBe(r2.openId);
    expect(r1.openId).toMatch(/^mock-openid-/);
  });

  it('不同 jsCode 映射到不同 openId', async () => {
    const r1 = await adapter.jscode2session('code-A');
    const r2 = await adapter.jscode2session('code-B');
    expect(r1.openId).not.toBe(r2.openId);
  });

  it('sessionKey 每次随机', async () => {
    const r1 = await adapter.jscode2session('same-code');
    const r2 = await adapter.jscode2session('same-code');
    expect(r1.sessionKey).not.toBe(r2.sessionKey);
  });
});

describe('WxLoginRealAdapter', () => {
  it('凭证缺失时构造抛错', () => {
    expect(() => new WxLoginRealAdapter({ appId: '', appSecret: '' })).toThrow(/credentials missing/);
  });

  it('真实凭证占位时调 jscode2session 抛 not configured', async () => {
    const adapter = new WxLoginRealAdapter({ appId: 'wx-app', appSecret: 'wx-secret' });
    await expect(adapter.jscode2session('any-js-code')).rejects.toThrow(/not configured/);
  });
});
