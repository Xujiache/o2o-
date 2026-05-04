import { RealnameMockAdapter, RealnameRealAdapter } from './realname.adapter';

describe('RealnameMockAdapter', () => {
  const adapter = new RealnameMockAdapter();

  it('姓名首字汉字 → success', async () => {
    const r = await adapter.verify('张三', '110101199001011234');
    expect(r.success).toBe(true);
    expect(r.providerRequestId).toMatch(/^mock-/);
    expect(r.reason).toBeUndefined();
  });

  it('姓名首字非汉字 → failed reason=内容不符', async () => {
    const r = await adapter.verify('Zhang San', '110101199001011234');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('内容不符');
  });

  it('空姓名 → failed', async () => {
    const r = await adapter.verify('', '110101199001011234');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('内容不符');
  });
});

describe('RealnameRealAdapter', () => {
  it('凭证缺失时构造抛错', () => {
    expect(() => new RealnameRealAdapter({ accessKeyId: '', accessKeySecret: '' })).toThrow(/credentials missing/);
  });

  it('真实凭证占位时调 verify 抛 not configured', async () => {
    const adapter = new RealnameRealAdapter({ accessKeyId: 'ak', accessKeySecret: 'sk' });
    await expect(adapter.verify('张三', '110101199001011234')).rejects.toThrow(/not configured/);
  });
});
