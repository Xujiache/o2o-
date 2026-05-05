import { WxpayMockAdapter, WxpayRealAdapter } from './wxpay.adapter';

describe('WxpayMockAdapter', () => {
  let svc: WxpayMockAdapter;
  beforeEach(() => {
    svc = new WxpayMockAdapter();
  });

  it('createPrepay 返 prepayId + payParams(JSON 字符串含 5 字段)', async () => {
    const r = await svc.createPrepay({
      outTradeNo: 'P20260506100000000001',
      amountCents: 3500,
      description: '外卖订单',
      notifyUrl: 'http://example/callback/wxpay',
    });
    expect(r.prepayId).toBe('mock-prepay-P20260506100000000001');
    const params = JSON.parse(r.payParams) as Record<string, string>;
    expect(params).toMatchObject({
      appId: 'wx_mock_app',
      package: `prepay_id=${r.prepayId}`,
      signType: 'RSA',
      paySign: 'mock-pay-sign',
    });
    expect(params.nonceStr).toContain('P20260506');
    expect(Number(params.timeStamp)).toBeGreaterThan(0);
  });

  it('parseCallback 验签通过 + 字段解析', () => {
    const body = JSON.stringify({
      outTradeNo: 'P20260506100000000002',
      channelTradeNo: 'wx_real_xxx',
      paidAmountCents: 3500,
      paidAt: 1714867800000,
    });
    const r = svc.parseCallback(body, 'mock-sign');
    expect(r).not.toBeNull();
    expect(r!.outTradeNo).toBe('P20260506100000000002');
    expect(r!.channelTradeNo).toBe('wx_real_xxx');
    expect(r!.paidAmountCents).toBe(3500);
    expect(r!.paidAt).toBe(1714867800000);
    expect(r!.raw).toBe(body);
  });

  it('parseCallback 验签失败返 null', () => {
    const body = JSON.stringify({ outTradeNo: 'P1' });
    expect(svc.parseCallback(body, 'wrong-sign')).toBeNull();
  });

  it('parseCallback rawBody 非 JSON 返 null', () => {
    expect(svc.parseCallback('not-json', 'mock-sign')).toBeNull();
  });

  it('verifyCallback 兼容方法返 true(stage 0 既有)', () => {
    expect(svc.verifyCallback()).toBe(true);
  });

  it('refund mock 返 refundId', async () => {
    const r = await svc.refund({
      outTradeNo: 'P1',
      outRefundNo: 'R1',
      totalCents: 3500,
      refundCents: 3500,
      notifyUrl: 'x',
    });
    expect(r.refundId).toBe('mock-refund-R1');
  });

  it('WxpayRealAdapter 缺凭证 → 抛错', () => {
    expect(() => new WxpayRealAdapter({ appId: '', mchId: '', apiV3Key: '' })).toThrow(/credentials missing/);
  });
});
