import { GetuiMockAdapter, GetuiRealAdapter } from './getui.adapter';

describe('GetuiMockAdapter', () => {
  const adapter = new GetuiMockAdapter();

  describe('pushOne / pushBatch (stage 0)', () => {
    it('pushOne 返回 mock taskId', async () => {
      const r = await adapter.pushOne({ cid: 'cid123456', title: 't', body: 'b' });
      expect(r.taskId).toMatch(/^mock-push-/);
    });

    it('pushBatch 返回 mock taskId', async () => {
      const r = await adapter.pushBatch(['cid1', 'cid2'], 't', 'b');
      expect(r.taskId).toMatch(/^mock-push-batch-/);
    });
  });

  describe('bindDevice / unbindDevice (stage 3)', () => {
    it('bindDevice 入参合法 → success', async () => {
      const r = await adapter.bindDevice({
        riderId: '12345',
        deviceToken: 'token-abc',
        platform: 'android',
      });
      expect(r.success).toBe(true);
      expect(r.providerRequestId).toMatch(/^mock-bind-/);
    });

    it('bindDevice riderId 为空 → failed', async () => {
      const r = await adapter.bindDevice({
        riderId: '',
        deviceToken: 'token-abc',
        platform: 'ios',
      });
      expect(r.success).toBe(false);
    });

    it('unbindDevice 入参合法 → success', async () => {
      const r = await adapter.unbindDevice({ riderId: '12345', deviceToken: 'token-abc' });
      expect(r.success).toBe(true);
      expect(r.providerRequestId).toMatch(/^mock-unbind-/);
    });

    it('unbindDevice deviceToken 为空 → failed', async () => {
      const r = await adapter.unbindDevice({ riderId: '12345', deviceToken: '' });
      expect(r.success).toBe(false);
    });
  });
});

describe('GetuiRealAdapter', () => {
  it('凭证缺失 → MISCONFIGURED: GETUI_APP_ID', () => {
    expect(() => new GetuiRealAdapter({ appId: '', appKey: '', masterSecret: '' })).toThrow(
      /MISCONFIGURED: GETUI_APP_ID/,
    );
  });

  it('凭证齐全可以构造(HTTP 调用不在单测范围)', () => {
    expect(() => new GetuiRealAdapter({ appId: 'a', appKey: 'b', masterSecret: 'c' })).not.toThrow();
  });
});
