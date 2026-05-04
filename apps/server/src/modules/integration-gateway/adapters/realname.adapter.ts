export interface RealnameAdapter {
  /** 校验姓名 + 身份证号 是否一致 */
  verifyIdCard(name: string, idCard: string): Promise<{ matched: boolean; reason?: string }>;
  /** 人脸 + 身份证比对 */
  verifyFace(idCard: string, faceImageBase64: string): Promise<{ matched: boolean; score?: number }>;
}

export class RealnameMockAdapter implements RealnameAdapter {
  async verifyIdCard(_name: string, idCard: string): Promise<{ matched: boolean; reason?: string }> {
    return { matched: idCard.length === 18 };
  }
  async verifyFace(): Promise<{ matched: boolean; score?: number }> {
    return { matched: true, score: 0.99 };
  }
}

export class RealnameRealAdapter implements RealnameAdapter {
  constructor(opts: { accessKeyId: string; accessKeySecret: string }) {
    if (!opts.accessKeyId || !opts.accessKeySecret) {
      throw new Error('realname credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  verifyIdCard(): Promise<{ matched: boolean; reason?: string }> {
    throw new Error('realname real adapter not implemented yet');
  }
  verifyFace(): Promise<{ matched: boolean; score?: number }> {
    throw new Error('realname real adapter not implemented yet');
  }
}
