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
  /**
   * 校验姓名 + 身份证号 三要素一致性(个人)。
   * mock 行为:姓名首字汉字 → success;否则 → failed("内容不符")。
   */
  verify(realName: string, idCardNo: string): Promise<RealnameVerifyResult>;

  /**
   * 企业三要素 + 资质核验(stage 2)。
   * mock 行为:licenseNo.length==18 且 legalName 首字汉字 → success;否则 → failed("企业资质不一致")。
   */
  verifyEnterprise(opts: VerifyEnterpriseOpts): Promise<RealnameVerifyResult>;

  /**
   * 人脸 + 身份证三要素核验(stage 3 骑手入驻)。
   * mock 行为:idCardNo.length==18 且 faceFileId 非空 且 realName 首字汉字 → success;否则 → failed("人脸核验未通过")。
   */
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

export class RealnameRealAdapter implements RealnameAdapter {
  constructor(opts: { accessKeyId: string; accessKeySecret: string }) {
    if (!opts.accessKeyId || !opts.accessKeySecret) {
      throw new Error('ali-realname credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  async verify(_realName: string, _idCardNo: string): Promise<RealnameVerifyResult> {
    throw new Error('ali-realname not configured (stage 1+)');
  }
  async verifyEnterprise(_opts: VerifyEnterpriseOpts): Promise<RealnameVerifyResult> {
    throw new Error('ali-realname enterprise not configured (stage 2+)');
  }
  async verifyFace(_opts: VerifyFaceOpts): Promise<RealnameVerifyResult> {
    throw new Error('ali-realname face not configured (stage 3+)');
  }
}
