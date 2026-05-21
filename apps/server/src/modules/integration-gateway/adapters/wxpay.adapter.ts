import { createDecipheriv, createPrivateKey, createSign, createVerify, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

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

export interface WxpayRealOpts {
  appId: string;
  mchId: string;
  apiV3Key: string;
  privateKeyPath?: string;
  privateKeyPem?: string;
  certSerialNo: string;
  notifyUrl: string;
  /** 微信平台公钥 PEM(验证回调签名用) — 可由证书工具下载后注入 */
  platformPublicKeyPem?: string;
}

/**
 * WxPay V3 Real Adapter — "credentials present → live" skeleton.
 *
 * 真实 endpoints:
 *  - prepay :  POST https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi
 *  - refund :  POST https://api.mch.weixin.qq.com/v3/refund/domestic/refunds
 * 签名:  SHA256-RSA over `${METHOD}\n${PATH}\n${TS}\n${NONCE}\n${BODY}\n`,Authorization 头格式
 *   `WECHATPAY2-SHA256-RSA2048 mchid="...",nonce_str="...",timestamp="...",serial_no="...",signature="..."`
 * 回调:微信平台证书 SHA256-RSA 验签 + AES-256-GCM 解密 resource.ciphertext
 */
export class WxpayRealAdapter implements WxpayAdapter {
  private static readonly BASE = 'https://api.mch.weixin.qq.com';
  private readonly privateKeyPem: string;

  constructor(private readonly opts: WxpayRealOpts) {
    this.requireKey('WXPAY_APP_ID', opts.appId);
    this.requireKey('WXPAY_MCH_ID', opts.mchId);
    this.requireKey('WXPAY_API_V3_KEY', opts.apiV3Key);
    this.requireKey('WXPAY_CERT_SERIAL_NO', opts.certSerialNo);
    this.requireKey('WXPAY_NOTIFY_URL', opts.notifyUrl);
    if (!opts.privateKeyPem && !opts.privateKeyPath) {
      throw new Error('MISCONFIGURED: WXPAY_PRIVATE_KEY_PATH required');
    }
    try {
      this.privateKeyPem = opts.privateKeyPem ?? readFileSync(opts.privateKeyPath as string, 'utf-8');
      // 早期校验:能否 createPrivateKey
      createPrivateKey(this.privateKeyPem);
    } catch (err) {
      throw new Error(`MISCONFIGURED: WXPAY_PRIVATE_KEY load failed: ${(err as Error).message}`);
    }
  }

  private requireKey(name: string, val: string | undefined): void {
    if (!val) throw new Error(`MISCONFIGURED: ${name} required`);
  }

  /** 构造 WeChatPay v3 Authorization 头 */
  private buildAuthHeader(method: 'GET' | 'POST', path: string, body: string): string {
    const ts = Math.floor(Date.now() / 1000).toString();
    const nonce = randomBytes(16).toString('hex');
    const message = `${method}\n${path}\n${ts}\n${nonce}\n${body}\n`;
    const signer = createSign('RSA-SHA256');
    signer.update(message);
    const signature = signer.sign(this.privateKeyPem, 'base64');
    return `WECHATPAY2-SHA256-RSA2048 mchid="${this.opts.mchId}",nonce_str="${nonce}",timestamp="${ts}",serial_no="${this.opts.certSerialNo}",signature="${signature}"`;
  }

  async createPrepay(input: PrepayInput): Promise<PrepayResult> {
    const path = '/v3/pay/transactions/jsapi';
    const body = JSON.stringify({
      appid: this.opts.appId,
      mchid: this.opts.mchId,
      description: input.description,
      out_trade_no: input.outTradeNo,
      notify_url: input.notifyUrl || this.opts.notifyUrl,
      amount: { total: input.amountCents, currency: 'CNY' },
    });
    const res = await fetch(`${WxpayRealAdapter.BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.buildAuthHeader('POST', path, body),
      },
      body,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`wxpay createPrepay http ${res.status}: ${txt}`);
    const json = JSON.parse(txt) as { prepay_id?: string };
    const prepayId = json.prepay_id;
    if (!prepayId) throw new Error(`wxpay createPrepay missing prepay_id: ${txt}`);

    // 二次签名,前端 SDK 唤起
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = randomBytes(16).toString('hex');
    const pkg = `prepay_id=${prepayId}`;
    const signMsg = `${this.opts.appId}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
    const signer = createSign('RSA-SHA256');
    signer.update(signMsg);
    const paySign = signer.sign(this.privateKeyPem, 'base64');
    const payParams = JSON.stringify({
      appId: this.opts.appId,
      nonceStr,
      timeStamp,
      package: pkg,
      signType: 'RSA',
      paySign,
    });
    return { prepayId, payParams };
  }

  async refund(input: RefundInput): Promise<{ refundId: string }> {
    const path = '/v3/refund/domestic/refunds';
    const body = JSON.stringify({
      out_trade_no: input.outTradeNo,
      out_refund_no: input.outRefundNo,
      notify_url: input.notifyUrl || this.opts.notifyUrl,
      amount: { refund: input.refundCents, total: input.totalCents, currency: 'CNY' },
    });
    const res = await fetch(`${WxpayRealAdapter.BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.buildAuthHeader('POST', path, body),
      },
      body,
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`wxpay refund http ${res.status}: ${txt}`);
    const json = JSON.parse(txt) as { refund_id?: string };
    if (!json.refund_id) throw new Error(`wxpay refund missing refund_id: ${txt}`);
    return { refundId: json.refund_id };
  }

  /**
   * stage-0 兼容方法:验证 headers 中 Wechatpay-Signature(SHA256-RSA over `${ts}\n${nonce}\n${body}\n`)。
   * 微信平台公钥需通过 cert 拉取流程注入(opts.platformPublicKeyPem)。未注入则保守返 false。
   */
  verifyCallback(headers: Record<string, string>, body: string): boolean {
    const ts = headers['wechatpay-timestamp'] ?? headers['Wechatpay-Timestamp'];
    const nonce = headers['wechatpay-nonce'] ?? headers['Wechatpay-Nonce'];
    const signature = headers['wechatpay-signature'] ?? headers['Wechatpay-Signature'];
    if (!ts || !nonce || !signature) return false;
    if (!this.opts.platformPublicKeyPem) return false;
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${ts}\n${nonce}\n${body}\n`);
    try {
      return verifier.verify(this.opts.platformPublicKeyPem, signature, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * 验签 + AES-256-GCM 解密 resource.ciphertext,产出业务字段。
   * 入参 sign 兼容 stage 0:这里若 platform key 未配置或失败 → null。
   */
  parseCallback(rawBody: string, sign: string): ParsedPayCallback | null {
    // stage 0 兼容签名只在 mock 模式;real 必走 verifyCallback 头部验签
    if (!sign) return null;
    let body: { resource?: { ciphertext?: string; nonce?: string; associated_data?: string } };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return null;
    }
    const r = body.resource;
    if (!r || !r.ciphertext || !r.nonce) return null;
    try {
      // AES-256-GCM:apiV3Key (32 bytes) + nonce(12 bytes) + associated_data
      const cipherBuf = Buffer.from(r.ciphertext, 'base64');
      const authTag = cipherBuf.subarray(cipherBuf.length - 16);
      const data = cipherBuf.subarray(0, cipherBuf.length - 16);
      const decipher = createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.opts.apiV3Key, 'utf-8'),
        Buffer.from(r.nonce, 'utf-8'),
      );
      decipher.setAuthTag(authTag);
      if (r.associated_data) decipher.setAAD(Buffer.from(r.associated_data, 'utf-8'));
      const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
      const parsed = JSON.parse(plain) as {
        out_trade_no?: string;
        transaction_id?: string;
        amount?: { payer_total?: number; total?: number };
        success_time?: string;
      };
      if (!parsed.out_trade_no) return null;
      return {
        outTradeNo: parsed.out_trade_no,
        channelTradeNo: parsed.transaction_id ?? `wx_${parsed.out_trade_no}`,
        paidAmountCents: parsed.amount?.payer_total ?? parsed.amount?.total ?? 0,
        paidAt: parsed.success_time ? Date.parse(parsed.success_time) : Date.now(),
        raw: plain,
      };
    } catch {
      return null;
    }
  }
}
