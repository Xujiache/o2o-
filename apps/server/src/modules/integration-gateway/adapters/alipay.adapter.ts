import type { ParsedPayCallback, PrepayInput, RefundInput } from './wxpay.adapter';

export interface AlipayPrepayResult {
  tradeNo: string;
  payUrl: string;
  /** 前端 SDK 唤起所需字符串(stage 5 mock:OrderInfo 字符串) */
  payParams: string;
}

export interface AlipayAdapter {
  createPrepay(input: PrepayInput): Promise<AlipayPrepayResult>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  /** stage 0 既有签名(params),保留兼容 */
  verifyCallback(params: Record<string, string>): boolean;
  /** stage 5 新增:验签 + 解析回调字段;失败返 null */
  parseCallback(rawBody: string, sign: string): ParsedPayCallback | null;
}

export class AlipayMockAdapter implements AlipayAdapter {
  async createPrepay(input: PrepayInput): Promise<AlipayPrepayResult> {
    const tradeNo = `mock-${input.outTradeNo}`;
    const payParams = `app_id=alipay_mock_app&out_trade_no=${input.outTradeNo}&total_amount=${(input.amountCents / 100).toFixed(2)}&sign=mock-pay-sign`;
    return { tradeNo, payUrl: `https://mock.alipay/${input.outTradeNo}`, payParams };
  }
  async refund(input: RefundInput): Promise<{ refundId: string }> {
    return { refundId: `mock-refund-${input.outRefundNo}` };
  }
  verifyCallback(): boolean {
    return true;
  }
  parseCallback(rawBody: string, sign: string): ParsedPayCallback | null {
    if (sign !== 'mock-sign') return null;
    let parsed: { outTradeNo?: string; channelTradeNo?: string; paidAmountCents?: number; paidAt?: number };
    try {
      parsed = JSON.parse(rawBody) as typeof parsed;
    } catch {
      return null;
    }
    if (!parsed.outTradeNo) return null;
    return {
      outTradeNo: parsed.outTradeNo,
      channelTradeNo: parsed.channelTradeNo ?? `alipay_mock_${parsed.outTradeNo}`,
      paidAmountCents: parsed.paidAmountCents ?? 0,
      paidAt: parsed.paidAt ?? Date.now(),
      raw: rawBody,
    };
  }
}

export class AlipayRealAdapter implements AlipayAdapter {
  constructor(opts: { appId: string; privateKey: string; publicKey: string }) {
    if (!opts.appId || !opts.privateKey || !opts.publicKey) {
      throw new Error('alipay credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  createPrepay(): Promise<AlipayPrepayResult> {
    throw new Error('alipay real adapter not implemented yet');
  }
  refund(): Promise<{ refundId: string }> {
    throw new Error('alipay real adapter not implemented yet');
  }
  verifyCallback(): boolean {
    throw new Error('alipay real adapter not implemented yet');
  }
  parseCallback(): ParsedPayCallback | null {
    throw new Error('alipay real adapter not implemented yet');
  }
}
