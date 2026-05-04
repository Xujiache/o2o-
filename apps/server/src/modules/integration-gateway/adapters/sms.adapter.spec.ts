import { SmsMockAdapter, SmsRealAdapter } from './sms.adapter';

describe('SmsMockAdapter', () => {
  it('send 返回 {success:true, providerRequestId:/^mock-/}', async () => {
    const adapter = new SmsMockAdapter();
    const result = await adapter.send('13800000001', 'login', '123456', 5);
    expect(result.success).toBe(true);
    expect(result.providerRequestId).toMatch(/^mock-/);
  });

  it('每次调用 providerRequestId 不同', async () => {
    const adapter = new SmsMockAdapter();
    const r1 = await adapter.send('13800000001', 'login', '111111');
    const r2 = await adapter.send('13800000001', 'login', '222222');
    expect(r1.providerRequestId).not.toBe(r2.providerRequestId);
  });
});

describe('SmsRealAdapter', () => {
  it('凭证缺失时构造抛错', () => {
    expect(() => new SmsRealAdapter({ accessKeyId: '', accessKeySecret: '', signName: '' })).toThrow(
      /credentials missing/,
    );
  });

  it('真实凭证占位时调 send 抛 not configured', async () => {
    const adapter = new SmsRealAdapter({ accessKeyId: 'ak', accessKeySecret: 'sk', signName: 'O2O' });
    await expect(adapter.send('13800000001', 'login', '123456')).rejects.toThrow(/not configured/);
  });
});
