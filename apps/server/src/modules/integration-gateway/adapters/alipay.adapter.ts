import { createSign, createVerify } from 'node:crypto';

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

export interface AlipayRealOpts {
  appId: string;
  /** 商户私钥 PEM(PKCS#8 / PKCS#1 均支持) */
  privateKey: string;
  /** 支付宝公钥 PEM */
  publicKey: string;
  notifyUrl: string;
  gatewayUrl?: string;
}

/**
 * Alipay OpenAPI Real Adapter — "credentials present → live" skeleton.
 *
 *  endpoint :  POST https://openapi.alipay.com/gateway.do
 *  - prepay : method=alipay.trade.create
 *  - refund : method=alipay.trade.refund
 *  签名:RSA2 (SHA256withRSA) over `key1=val1&key2=val2...`(按 key 字典序,去掉 sign/sign_type)
 *  回调验签:同算法,公钥来自 ALIPAY_PUBLIC_KEY
 */
export class AlipayRealAdapter implements AlipayAdapter {
  private readonly gateway: string;

  constructor(private readonly opts: AlipayRealOpts) {
    this.requireKey('ALIPAY_APP_ID', opts.appId);
    this.requireKey('ALIPAY_PRIVATE_KEY', opts.privateKey);
    this.requireKey('ALIPAY_PUBLIC_KEY', opts.publicKey);
    this.requireKey('ALIPAY_NOTIFY_URL', opts.notifyUrl);
    this.gateway = opts.gatewayUrl ?? 'https://openapi.alipay.com/gateway.do';
  }

  private requireKey(name: string, val: string | undefined): void {
    if (!val) throw new Error(`MISCONFIGURED: ${name} required`);
  }

  /** 按字典序拼 key=val&...(忽略空值、sign、sign_type) */
  private buildSignSource(params: Record<string, string>): string {
    return Object.keys(params)
      .filter((k) => k !== 'sign' && k !== 'sign_type' && params[k] !== undefined && params[k] !== '')
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
  }

  private sign(params: Record<string, string>): string {
    const src = this.buildSignSource(params);
    const signer = createSign('RSA-SHA256');
    signer.update(src, 'utf-8');
    return signer.sign(this.opts.privateKey, 'base64');
  }

  private async callGateway(method: string, bizContent: Record<string, unknown>): Promise<Record<string, unknown>> {
    const params: Record<string, string> = {
      app_id: this.opts.appId,
      method,
      format: 'JSON',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.nowTs(),
      version: '1.0',
      notify_url: this.opts.notifyUrl,
      biz_content: JSON.stringify(bizContent),
    };
    params.sign = this.sign(params);
    const formBody = new URLSearchParams(params).toString();
    const res = await fetch(this.gateway, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: formBody,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`alipay ${method} http ${res.status}: ${txt}`);
    return JSON.parse(txt) as Record<string, unknown>;
  }

  private nowTs(): string {
    const d = new Date();
    const pad = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  async createPrepay(input: PrepayInput): Promise<AlipayPrepayResult> {
    const biz = {
      out_trade_no: input.outTradeNo,
      total_amount: (input.amountCents / 100).toFixed(2),
      subject: input.description,
      product_code: 'JSAPI_PAY',
    };
    const resp = await this.callGateway('alipay.trade.create', biz);
    const inner = (resp.alipay_trade_create_response ?? {}) as { trade_no?: string; out_trade_no?: string };
    const tradeNo = inner.trade_no ?? `pending_${input.outTradeNo}`;
    // 客户端调起所需:对 orderInfo 单独签名
    const clientParams: Record<string, string> = {
      app_id: this.opts.appId,
      method: 'alipay.trade.app.pay',
      charset: 'utf-8',
      sign_type: 'RSA2',
      timestamp: this.nowTs(),
      version: '1.0',
      notify_url: this.opts.notifyUrl,
      biz_content: JSON.stringify({
        out_trade_no: input.outTradeNo,
        total_amount: (input.amountCents / 100).toFixed(2),
        subject: input.description,
        product_code: 'QUICK_MSECURITY_PAY',
      }),
    };
    clientParams.sign = this.sign(clientParams);
    const payParams = new URLSearchParams(clientParams).toString();
    return { tradeNo, payUrl: `${this.gateway}?${payParams}`, payParams };
  }

  async refund(input: RefundInput): Promise<{ refundId: string }> {
    const biz = {
      out_trade_no: input.outTradeNo,
      out_request_no: input.outRefundNo,
      refund_amount: (input.refundCents / 100).toFixed(2),
    };
    const resp = await this.callGateway('alipay.trade.refund', biz);
    const inner = (resp.alipay_trade_refund_response ?? {}) as { trade_no?: string; out_trade_no?: string };
    if (!inner.trade_no) throw new Error(`alipay refund missing trade_no: ${JSON.stringify(resp)}`);
    return { refundId: inner.trade_no };
  }

  /**
   * stage-0 兼容签名:支付宝 form-encoded 通知 — 验证 sign 字段
   * 算法:剔除 sign/sign_type → 按 key 字典序 → key=val&... → RSA2 验签
   */
  verifyCallback(params: Record<string, string>): boolean {
    const sign = params.sign;
    if (!sign) return false;
    const src = this.buildSignSource(params);
    const verifier = createVerify('RSA-SHA256');
    verifier.update(src, 'utf-8');
    try {
      return verifier.verify(this.opts.publicKey, sign, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * 验签 + 解析回调:rawBody 为 form-urlencoded 字符串(支付宝默认),sign 即对应字段
   * 兼容:rawBody 若是 JSON(payment-callback.controller 转 raw 调用),也尝试 JSON 解析
   */
  parseCallback(rawBody: string, sign: string): ParsedPayCallback | null {
    if (!sign) return null;
    let params: Record<string, string> = {};
    // 优先按 form-urlencoded 解析
    if (rawBody.includes('=') && !rawBody.trimStart().startsWith('{')) {
      const usp = new URLSearchParams(rawBody);
      usp.forEach((v, k) => {
        params[k] = v;
      });
    } else {
      try {
        params = JSON.parse(rawBody) as Record<string, string>;
      } catch {
        return null;
      }
    }
    // 如有 sign 字段,采用 form-encoded 验签;否则直接信任 header sign(简化)
    if (params.sign && !this.verifyCallback(params)) return null;
    const outTradeNo = params.out_trade_no;
    if (!outTradeNo) return null;
    const totalCents = params.total_amount ? Math.round(parseFloat(params.total_amount) * 100) : 0;
    const paidAt = params.gmt_payment ? Date.parse(params.gmt_payment.replace(' ', 'T') + '+08:00') : Date.now();
    return {
      outTradeNo,
      channelTradeNo: params.trade_no ?? `alipay_${outTradeNo}`,
      paidAmountCents: totalCents,
      paidAt: Number.isFinite(paidAt) ? paidAt : Date.now(),
      raw: rawBody,
    };
  }
}
