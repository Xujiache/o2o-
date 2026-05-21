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
  it('凭证缺失 → MISCONFIGURED: ALI_SMS_ACCESS_KEY_ID', () => {
    expect(() => new SmsRealAdapter({ accessKeyId: '', accessKeySecret: '', signName: '' })).toThrow(
      /MISCONFIGURED: ALI_SMS_ACCESS_KEY_ID/,
    );
  });

  it('缺模板 → MISCONFIGURED: ALI_SMS_TEMPLATE_LOGIN', () => {
    expect(() => new SmsRealAdapter({ accessKeyId: 'ak', accessKeySecret: 'sk', signName: 'O2O' })).toThrow(
      /MISCONFIGURED: ALI_SMS_TEMPLATE_LOGIN/,
    );
  });

  it('凭证齐全可以构造(HTTP 调用不在单测范围)', () => {
    expect(
      () =>
        new SmsRealAdapter({
          accessKeyId: 'ak',
          accessKeySecret: 'sk',
          signName: 'O2O',
          templateLogin: 'SMS_12345',
        }),
    ).not.toThrow();
  });
});
