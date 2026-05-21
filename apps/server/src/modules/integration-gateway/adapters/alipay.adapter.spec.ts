import { AlipayMockAdapter, AlipayRealAdapter } from './alipay.adapter';

describe('AlipayMockAdapter', () => {
  let svc: AlipayMockAdapter;
  beforeEach(() => {
    svc = new AlipayMockAdapter();
  });

  it('createPrepay 返 tradeNo + payUrl + payParams', async () => {
    const r = await svc.createPrepay({
      outTradeNo: 'P20260506100000000003',
      amountCents: 5800,
      description: '外卖',
      notifyUrl: 'http://example/callback/alipay',
    });
    expect(r.tradeNo).toBe('mock-P20260506100000000003');
    expect(r.payUrl).toContain('mock.alipay');
    expect(r.payParams).toContain('out_trade_no=P20260506100000000003');
    expect(r.payParams).toContain('total_amount=58.00');
    expect(r.payParams).toContain('sign=mock-pay-sign');
  });

  it('parseCallback 验签通过', () => {
    const body = JSON.stringify({
      outTradeNo: 'P20260506100000000004',
      channelTradeNo: '2026050622001',
      paidAmountCents: 5800,
      paidAt: 1714867900000,
    });
    const r = svc.parseCallback(body, 'mock-sign');
    expect(r).not.toBeNull();
    expect(r!.outTradeNo).toBe('P20260506100000000004');
    expect(r!.channelTradeNo).toBe('2026050622001');
    expect(r!.paidAmountCents).toBe(5800);
  });

  it('parseCallback 验签失败 / outTradeNo 缺失返 null', () => {
    expect(svc.parseCallback('{}', 'mock-sign')).toBeNull();
    expect(svc.parseCallback(JSON.stringify({ outTradeNo: 'P1' }), 'wrong')).toBeNull();
  });

  it('AlipayRealAdapter 缺凭证 → 抛 MISCONFIGURED', () => {
    expect(() => new AlipayRealAdapter({ appId: '', privateKey: '', publicKey: '', notifyUrl: '' })).toThrow(
      /MISCONFIGURED: ALIPAY_APP_ID/,
    );
  });

  it('AlipayRealAdapter 缺 notifyUrl → 抛 MISCONFIGURED', () => {
    expect(() => new AlipayRealAdapter({ appId: 'a', privateKey: 'pk', publicKey: 'pub', notifyUrl: '' })).toThrow(
      /MISCONFIGURED: ALIPAY_NOTIFY_URL/,
    );
  });
});
