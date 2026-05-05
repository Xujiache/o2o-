export interface PrepayInput {
  outTradeNo: string;
  amountCents: number;
  description: string;
  notifyUrl: string;
}

export interface RefundInput {
  outTradeNo: string;
  outRefundNo: string;
  totalCents: number;
  refundCents: number;
  notifyUrl: string;
}

export interface PrepayResult {
  prepayId: string;
  /** 前端 SDK 唤起所需 JSON 字符串(stage 5 mock:含 appId/nonceStr/timeStamp/package/signType/paySign 5 字段) */
  payParams: string;
}

export interface ParsedPayCallback {
  outTradeNo: string;
  channelTradeNo: string;
  paidAmountCents: number;
  paidAt: number;
  raw: string;
}

export interface WxpayAdapter {
  createPrepay(input: PrepayInput): Promise<PrepayResult>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  /** stage 0 既有签名(headers + body),保留兼容 */
  verifyCallback(headers: Record<string, string>, body: string): boolean;
  /** stage 5 新增:验签 + 解析回调字段;失败返 null */
  parseCallback(rawBody: string, sign: string): ParsedPayCallback | null;
}

export class WxpayMockAdapter implements WxpayAdapter {
  async createPrepay(input: PrepayInput): Promise<PrepayResult> {
    const prepayId = `mock-prepay-${input.outTradeNo}`;
    const payParams = JSON.stringify({
      appId: 'wx_mock_app',
      nonceStr: `n${input.outTradeNo}`,
      timeStamp: String(Math.floor(Date.now() / 1000)),
      package: `prepay_id=${prepayId}`,
      signType: 'RSA',
      paySign: 'mock-pay-sign',
    });
    return { prepayId, payParams };
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
      channelTradeNo: parsed.channelTradeNo ?? `wx_mock_${parsed.outTradeNo}`,
      paidAmountCents: parsed.paidAmountCents ?? 0,
      paidAt: parsed.paidAt ?? Date.now(),
      raw: rawBody,
    };
  }
}

export class WxpayRealAdapter implements WxpayAdapter {
  constructor(opts: { appId: string; mchId: string; apiV3Key: string }) {
    if (!opts.appId || !opts.mchId || !opts.apiV3Key) {
      throw new Error('wxpay credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  createPrepay(): Promise<PrepayResult> {
    throw new Error('wxpay real adapter not implemented yet');
  }
  refund(): Promise<{ refundId: string }> {
    throw new Error('wxpay real adapter not implemented yet');
  }
  verifyCallback(): boolean {
    throw new Error('wxpay real adapter not implemented yet');
  }
  parseCallback(): ParsedPayCallback | null {
    throw new Error('wxpay real adapter not implemented yet');
  }
}
