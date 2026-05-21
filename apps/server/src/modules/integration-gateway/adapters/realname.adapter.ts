import { createHash, createHmac, randomUUID } from 'node:crypto';

import { nanoid } from 'nanoid';

export type RealnameFailedReason = '内容不符' | '三要素不一致' | '三方不可用' | '企业资质不一致' | '人脸核验未通过';

export interface RealnameVerifyResult {
  success: boolean;
  providerRequestId: string;
  /** 失败原因(标准化文案,不含第三方原文) */
  reason?: RealnameFailedReason;
}

export interface VerifyEnterpriseOpts {
  /** 营业执照号 */
  licenseNo: string;
  /** 法人姓名 */
  legalName: string;
  /** 法人身份证号 */
  legalIdCardNo: string;
  /** 食品许可证号(餐饮类必填) */
  foodPermitNo?: string;
}

export interface VerifyFaceOpts {
  /** 18 位身份证号 */
  idCardNo: string;
  /** 真实姓名 */
  realName: string;
  /** 人脸视频/照片文件 ID(file_object 表) */
  faceFileId: string;
}

export interface RealnameAdapter {
  verify(realName: string, idCardNo: string): Promise<RealnameVerifyResult>;
  verifyEnterprise(opts: VerifyEnterpriseOpts): Promise<RealnameVerifyResult>;
  verifyFace(opts: VerifyFaceOpts): Promise<RealnameVerifyResult>;
}

export class RealnameMockAdapter implements RealnameAdapter {
  async verify(realName: string, _idCardNo: string): Promise<RealnameVerifyResult> {
    const firstChar = realName.trim().charAt(0);
    const isChinese = /^[一-龥]$/.test(firstChar);
    if (isChinese) {
      return { success: true, providerRequestId: `mock-${nanoid(16)}` };
    }
    return { success: false, providerRequestId: `mock-${nanoid(16)}`, reason: '内容不符' };
  }

  async verifyEnterprise(opts: VerifyEnterpriseOpts): Promise<RealnameVerifyResult> {
    const legalFirstChar = opts.legalName.trim().charAt(0);
    const isLegalChinese = /^[一-龥]$/.test(legalFirstChar);
    const licenseOk = opts.licenseNo.trim().length === 18;
    if (isLegalChinese && licenseOk) {
      return { success: true, providerRequestId: `mock-${nanoid(16)}` };
    }
    return { success: false, providerRequestId: `mock-${nanoid(16)}`, reason: '企业资质不一致' };
  }

  async verifyFace(opts: VerifyFaceOpts): Promise<RealnameVerifyResult> {
    const firstChar = opts.realName.trim().charAt(0);
    const isChinese = /^[一-龥]$/.test(firstChar);
    const idCardOk = opts.idCardNo.trim().length === 18;
    const fileOk = opts.faceFileId.trim().length > 0;
    if (isChinese && idCardOk && fileOk) {
      return { success: true, providerRequestId: `mock-${nanoid(16)}` };
    }
    return { success: false, providerRequestId: `mock-${nanoid(16)}`, reason: '人脸核验未通过' };
  }
}

export interface RealnameRealOpts {
  accessKeyId: string;
  accessKeySecret: string;
  /** 默认 cloudauth.aliyuncs.com(实人认证) */
  endpoint?: string;
}

/**
 * 阿里云实名 Real Adapter — "credentials present → live" skeleton.
 *  - 服务      : 阿里云 CloudAuth(实人认证) 或 IDFaceVerify(身份核验)
 *  - endpoint  : https://cloudauth.aliyuncs.com
 *  - action    : Id2MetaVerify (三要素) / DescribeFaceVerify (人脸)
 *  - 签名      : ACS3-HMAC-SHA256 v3(同短信)
 */
export class RealnameRealAdapter implements RealnameAdapter {
  private readonly endpoint: string;

  constructor(private readonly opts: RealnameRealOpts) {
    this.requireKey('ALI_REALNAME_AK', opts.accessKeyId);
    this.requireKey('ALI_REALNAME_SK', opts.accessKeySecret);
    this.endpoint = opts.endpoint ?? 'https://cloudauth.aliyuncs.com';
  }

  private requireKey(name: string, val: string | undefined): void {
    if (!val) throw new Error(`MISCONFIGURED: ${name} required`);
  }

  private signRequest(params: {
    method: string;
    query: Record<string, string>;
    body: string;
    headers: Record<string, string>;
    action: string;
    version: string;
  }): string {
    const { method, query, body, headers, action, version } = params;
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
    const canonicalRequest = [method, '/', canonicalQuery, canonicalHeaders, signedHeaders, hashedPayload].join('\n');
    const stringToSign = `ACS3-HMAC-SHA256\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;
    const signature = createHmac('sha256', this.opts.accessKeySecret).update(stringToSign).digest('hex');
    return `ACS3-HMAC-SHA256 Credential=${this.opts.accessKeyId},SignedHeaders=${signedHeaders},Signature=${signature}`;
  }

  private async call(action: string, version: string, query: Record<string, string>): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      host: new URL(this.endpoint).host,
      'x-acs-date': new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      'x-acs-signature-nonce': randomUUID(),
    };
    headers.Authorization = this.signRequest({
      method: 'POST',
      query,
      body: '',
      headers,
      action,
      version,
    });
    const url = `${this.endpoint}/?${Object.keys(query)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(query[k] ?? '')}`)
      .join('&')}`;
    const res = await fetch(url, { method: 'POST', headers });
    const txt = await res.text();
    if (!res.ok) throw new Error(`ali-realname ${action} http ${res.status}: ${txt}`);
    return JSON.parse(txt) as Record<string, unknown>;
  }

  async verify(realName: string, idCardNo: string): Promise<RealnameVerifyResult> {
    try {
      const json = await this.call('Id2MetaVerify', '2019-03-07', {
        ParamType: 'normal',
        UserName: realName,
        IdentifyNum: idCardNo,
      });
      const data = (json.Data ?? {}) as { Bizcode?: string; ResultObject?: { Bizcode?: string } };
      const code = data.Bizcode ?? data.ResultObject?.Bizcode;
      const reqId = String(json.RequestId ?? `ali-${Date.now()}`);
      if (code === '1') return { success: true, providerRequestId: reqId };
      return { success: false, providerRequestId: reqId, reason: '三要素不一致' };
    } catch {
      return { success: false, providerRequestId: `err-${Date.now()}`, reason: '三方不可用' };
    }
  }

  async verifyEnterprise(opts: VerifyEnterpriseOpts): Promise<RealnameVerifyResult> {
    try {
      const json = await this.call('VerifyEnterpriseFourMeta', '2019-03-07', {
        LicenseNo: opts.licenseNo,
        EnterpriseName: '', // 由调用方补;骨架先留空,真实接入时增字段
        LegalPerson: opts.legalName,
        LegalPersonCertNo: opts.legalIdCardNo,
      });
      const reqId = String(json.RequestId ?? `ali-${Date.now()}`);
      const data = (json.Data ?? {}) as { VerifyResult?: string };
      if (data.VerifyResult === '1') return { success: true, providerRequestId: reqId };
      return { success: false, providerRequestId: reqId, reason: '企业资质不一致' };
    } catch {
      return { success: false, providerRequestId: `err-${Date.now()}`, reason: '三方不可用' };
    }
  }

  async verifyFace(opts: VerifyFaceOpts): Promise<RealnameVerifyResult> {
    try {
      const json = await this.call('DescribeFaceVerify', '2019-03-07', {
        SceneId: 'rider-onboarding',
        OuterOrderNo: opts.faceFileId,
        CertName: opts.realName,
        CertNo: opts.idCardNo,
      });
      const reqId = String(json.RequestId ?? `ali-${Date.now()}`);
      const data = (json.ResultObject ?? {}) as { Passed?: string };
      if (data.Passed === 'T') return { success: true, providerRequestId: reqId };
      return { success: false, providerRequestId: reqId, reason: '人脸核验未通过' };
    } catch {
      return { success: false, providerRequestId: `err-${Date.now()}`, reason: '三方不可用' };
    }
  }
}
