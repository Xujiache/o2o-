import type { PrepayInput, RefundInput } from './wxpay.adapter';

export interface AlipayAdapter {
  createPrepay(input: PrepayInput): Promise<{ tradeNo: string; payUrl: string }>;
  refund(input: RefundInput): Promise<{ refundId: string }>;
  verifyCallback(params: Record<string, string>): boolean;
}

export class AlipayMockAdapter implements AlipayAdapter {
  async createPrepay(input: PrepayInput): Promise<{ tradeNo: string; payUrl: string }> {
    return { tradeNo: `mock-${input.outTradeNo}`, payUrl: `https://mock.alipay/${input.outTradeNo}` };
  }
  async refund(input: RefundInput): Promise<{ refundId: string }> {
    return { refundId: `mock-refund-${input.outRefundNo}` };
  }
  verifyCallback(): boolean {
    return true;
  }
}

export class AlipayRealAdapter implements AlipayAdapter {
  constructor(opts: { appId: string; privateKey: string; publicKey: string }) {
    if (!opts.appId || !opts.privateKey || !opts.publicKey) {
      throw new Error('alipay credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  createPrepay(): Promise<{ tradeNo: string; payUrl: string }> {
    throw new Error('alipay real adapter not implemented yet');
  }
  refund(): Promise<{ refundId: string }> {
    throw new Error('alipay real adapter not implemented yet');
  }
  verifyCallback(): boolean {
    throw new Error('alipay real adapter not implemented yet');
  }
}
