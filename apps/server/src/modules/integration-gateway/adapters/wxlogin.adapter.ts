import { createHash } from 'node:crypto';

import { nanoid } from 'nanoid';

export interface WxLoginSession {
  openId: string;
  sessionKey: string;
  unionId?: string;
}

export interface WxLoginAdapter {
  /**
   * 微信小程序 jscode2session — 用 jsCode 换 openId/sessionKey。
   * mock 行为(T02):同一 jsCode 始终映射到同一 openId(md5 前 16 位),session_key 每次随机。
   */
  jscode2session(jsCode: string): Promise<WxLoginSession>;
}

export class WxLoginMockAdapter implements WxLoginAdapter {
  async jscode2session(jsCode: string): Promise<WxLoginSession> {
    const hash = createHash('md5').update(jsCode).digest('hex').slice(0, 16);
    return {
      openId: `mock-openid-${hash}`,
      sessionKey: `mock-${nanoid(16)}`,
    };
  }
}

export class WxLoginRealAdapter implements WxLoginAdapter {
  constructor(opts: { appId: string; appSecret: string }) {
    if (!opts.appId || !opts.appSecret) {
      throw new Error('wxlogin credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  async jscode2session(_jsCode: string): Promise<WxLoginSession> {
    throw new Error('wxlogin not configured (stage 1+)');
  }
}
