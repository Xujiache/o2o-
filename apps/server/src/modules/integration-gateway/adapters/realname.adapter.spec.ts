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

  describe('verifyEnterprise (stage 2)', () => {
    it('企业三要素合法 → success', async () => {
      const r = await adapter.verifyEnterprise({
        licenseNo: '91110000MA001ABCD1',
        legalName: '张总',
        legalIdCardNo: '110101199001011234',
      });
      expect(r.success).toBe(true);
      expect(r.providerRequestId).toMatch(/^mock-/);
    });

    it('法人首字非汉字 → failed reason=企业资质不一致', async () => {
      const r = await adapter.verifyEnterprise({
        licenseNo: '91110000MA001ABCD1',
        legalName: 'John CEO',
        legalIdCardNo: '110101199001011234',
      });
      expect(r.success).toBe(false);
      expect(r.reason).toBe('企业资质不一致');
    });

    it('营业执照号长度不为 18 → failed', async () => {
      const r = await adapter.verifyEnterprise({
        licenseNo: 'TOO-SHORT',
        legalName: '张总',
        legalIdCardNo: '110101199001011234',
      });
      expect(r.success).toBe(false);
      expect(r.reason).toBe('企业资质不一致');
    });
  });

  describe('verifyFace (stage 3)', () => {
    it('身份证 18 位 + faceFileId 非空 + 姓名首字汉字 → success', async () => {
      const r = await adapter.verifyFace({
        idCardNo: '110101199001011234',
        realName: '骑手张三',
        faceFileId: 'file-123',
      });
      expect(r.success).toBe(true);
      expect(r.providerRequestId).toMatch(/^mock-/);
    });

    it('身份证长度不为 18 → failed reason=人脸核验未通过', async () => {
      const r = await adapter.verifyFace({
        idCardNo: '12345',
        realName: '张三',
        faceFileId: 'file-123',
      });
      expect(r.success).toBe(false);
      expect(r.reason).toBe('人脸核验未通过');
    });

    it('faceFileId 为空 → failed', async () => {
      const r = await adapter.verifyFace({
        idCardNo: '110101199001011234',
        realName: '张三',
        faceFileId: '',
      });
      expect(r.success).toBe(false);
      expect(r.reason).toBe('人脸核验未通过');
    });

    it('姓名首字非汉字 → failed', async () => {
      const r = await adapter.verifyFace({
        idCardNo: '110101199001011234',
        realName: 'Zhang San',
        faceFileId: 'file-123',
      });
      expect(r.success).toBe(false);
      expect(r.reason).toBe('人脸核验未通过');
    });
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

  it('真实凭证占位时调 verifyEnterprise 抛 enterprise not configured', async () => {
    const adapter = new RealnameRealAdapter({ accessKeyId: 'ak', accessKeySecret: 'sk' });
    await expect(
      adapter.verifyEnterprise({
        licenseNo: '91110000MA001ABCD1',
        legalName: '张总',
        legalIdCardNo: '110101199001011234',
      }),
    ).rejects.toThrow(/enterprise not configured/);
  });

  it('真实凭证占位时调 verifyFace 抛 face not configured', async () => {
    const adapter = new RealnameRealAdapter({ accessKeyId: 'ak', accessKeySecret: 'sk' });
    await expect(
      adapter.verifyFace({
        idCardNo: '110101199001011234',
        realName: '张三',
        faceFileId: 'file-1',
      }),
    ).rejects.toThrow(/face not configured/);
  });
});
