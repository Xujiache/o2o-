import { createHash, createHmac, randomUUID } from 'node:crypto';

import { nanoid } from 'nanoid';

export interface SmsSendResult {
  success: boolean;
  providerRequestId: string;
}

export interface SmsAdapter {
  /**
   * 发送验证码短信。
   * @param mobile  目标手机号(明文)
   * @param scene   场景:login / realname / change-mobile / sensitive
   * @param code    6 位数字验证码
   * @param ttlMinutes 验证码有效期(分钟,默认 5)
   */
  send(mobile: string, scene: string, code: string, ttlMinutes?: number): Promise<SmsSendResult>;
}

export class SmsMockAdapter implements SmsAdapter {
  async send(mobile: string, scene: string, code: string, _ttlMinutes?: number): Promise<SmsSendResult> {
    // eslint-disable-next-line no-console
    console.info(`[sms-mock] scene=${scene} ${mobile.slice(0, 3)}****${mobile.slice(-4)} code=${code}`);
    return { success: true, providerRequestId: `mock-${nanoid(16)}` };
  }
}

export interface SmsRealOpts {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  /** 验证码模板(login 场景默认),其他场景可由 sceneTemplateMap 自定义 */
  templateLogin?: string;
  /** scene → templateCode 映射(覆盖 templateLogin) */
  sceneTemplateMap?: Record<string, string>;
  endpoint?: string;
}

/**
 * 阿里云短信 Real Adapter — "credentials present → live" skeleton.
 *  - endpoint : https://dysmsapi.aliyuncs.com
 *  - action   : SendSms (2017-05-25)
 *  - 签名     : ACS3-HMAC-SHA256(v3) — canonical request → string-to-sign → HMAC-SHA256 over secret
 */
export class SmsRealAdapter implements SmsAdapter {
  private readonly endpoint: string;

  constructor(private readonly opts: SmsRealOpts) {
    this.requireKey('ALI_SMS_ACCESS_KEY_ID', opts.accessKeyId);
    this.requireKey('ALI_SMS_ACCESS_KEY_SECRET', opts.accessKeySecret);
    this.requireKey('ALI_SMS_SIGN_NAME', opts.signName);
    if (!opts.templateLogin && !opts.sceneTemplateMap) {
      throw new Error('MISCONFIGURED: ALI_SMS_TEMPLATE_LOGIN required');
    }
    this.endpoint = opts.endpoint ?? 'https://dysmsapi.aliyuncs.com';
  }

  private requireKey(name: string, val: string | undefined): void {
    if (!val) throw new Error(`MISCONFIGURED: ${name} required`);
  }

  private templateFor(scene: string): string {
    const fromMap = this.opts.sceneTemplateMap?.[scene];
    return fromMap ?? this.opts.templateLogin ?? '';
  }

  /** ACS3-HMAC-SHA256 签名:符合阿里云开放平台 v3 规范 */
  private signRequest(params: {
    method: string;
    path: string;
    query: Record<string, string>;
    body: string;
    headers: Record<string, string>;
    action: string;
    version: string;
  }): string {
    const { method, path, query, body, headers, action, version } = params;
    const canonicalQuery = Object.keys(query)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k] ?? '')}`)
      .join('&');
    const hashedPayload = createHash('sha256').update(body).digest('hex');
    headers['x-acs-content-sha256'] = hashedPayload;
    headers['x-acs-action'] = action;
    headers['x-acs-version'] = version;
    const lowerHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) lowerHeaders[k.toLowerCase()] = String(v);
    const signedHeaderKeys = Object.keys(lowerHeaders).sort();
    const canonicalHeaders = signedHeaderKeys.map((k) => `${k}:${lowerHeaders[k]}`).join('\n') + '\n';
    const signedHeaders = signedHeaderKeys.join(';');
    const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, hashedPayload].join('\n');
    const stringToSign = `ACS3-HMAC-SHA256\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;
    const signature = createHmac('sha256', this.opts.accessKeySecret).update(stringToSign).digest('hex');
    return `ACS3-HMAC-SHA256 Credential=${this.opts.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;
  }

  async send(mobile: string, scene: string, code: string, _ttlMinutes?: number): Promise<SmsSendResult> {
    const templateCode = this.templateFor(scene);
    if (!templateCode) throw new Error(`MISCONFIGURED: ALI_SMS_TEMPLATE_${scene.toUpperCase()} missing`);

    const action = 'SendSms';
    const version = '2017-05-25';
    const query: Record<string, string> = {
      PhoneNumbers: mobile,
      SignName: this.opts.signName,
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify({ code }),
    };
    const body = '';
    const headers: Record<string, string> = {
      host: new URL(this.endpoint).host,
      'x-acs-date': new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      'x-acs-signature-nonce': randomUUID(),
    };
    headers.Authorization = this.signRequest({
      method: 'POST',
      path: '/',
      query,
      body,
      headers,
      action,
      version,
    });
    const url = `${this.endpoint}/?${Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k] ?? '')}`)
      .join('&')}`;
    const res = await fetch(url, { method: 'POST', headers, body });
    const txt = await res.text();
    if (!res.ok) throw new Error(`ali-sms http ${res.status}: ${txt}`);
    const json = JSON.parse(txt) as { Code?: string; RequestId?: string; Message?: string };
    return {
      success: json.Code === 'OK',
      providerRequestId: json.RequestId ?? `ali-${Date.now()}`,
    };
  }
}
