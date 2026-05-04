import { nanoid } from 'nanoid';

export type RealnameFailedReason = '内容不符' | '三要素不一致' | '三方不可用';

export interface RealnameVerifyResult {
  success: boolean;
  providerRequestId: string;
  /** 失败原因(标准化文案,不含第三方原文) */
  reason?: RealnameFailedReason;
}

export interface RealnameAdapter {
  /**
   * 校验姓名 + 身份证号 三要素一致性。
   * mock 行为(T02):姓名首字汉字 → success;否则 → failed("内容不符")。
   */
  verify(realName: string, idCardNo: string): Promise<RealnameVerifyResult>;
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
}

export class RealnameRealAdapter implements RealnameAdapter {
  constructor(opts: { accessKeyId: string; accessKeySecret: string }) {
    if (!opts.accessKeyId || !opts.accessKeySecret) {
      throw new Error('ali-realname credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  async verify(_realName: string, _idCardNo: string): Promise<RealnameVerifyResult> {
    throw new Error('ali-realname not configured (stage 1+)');
  }
}
