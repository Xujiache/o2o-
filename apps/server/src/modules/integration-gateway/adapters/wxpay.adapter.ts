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

export interface WxpayAdapter {
  createPrepay(input: PrepayInput): Promise<{ prepayId: string }>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  verifyCallback(headers: Record<string, string>, body: string): boolean;
}

export class WxpayMockAdapter implements WxpayAdapter {
  async createPrepay(input: PrepayInput): Promise<{ prepayId: string }> {
    return { prepayId: `mock-prepay-${input.outTradeNo}` };
  }
  async refund(input: RefundInput): Promise<{ refundId: string }> {
    return { refundId: `mock-refund-${input.outRefundNo}` };
  }
  verifyCallback(): boolean {
    return true;
  }
}

export class WxpayRealAdapter implements WxpayAdapter {
  constructor(opts: { appId: string; mchId: string; apiV3Key: string }) {
    if (!opts.appId || !opts.mchId || !opts.apiV3Key) {
      throw new Error('wxpay credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  createPrepay(): Promise<{ prepayId: string }> {
    throw new Error('wxpay real adapter not implemented yet');
  }
  refund(): Promise<{ refundId: string }> {
    throw new Error('wxpay real adapter not implemented yet');
  }
  verifyCallback(): boolean {
    throw new Error('wxpay real adapter not implemented yet');
  }
}
