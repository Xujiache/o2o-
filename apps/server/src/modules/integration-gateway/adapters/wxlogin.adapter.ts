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

export interface WxLoginRealOpts {
  appId: string;
  appSecret: string;
  endpoint?: string;
}

/**
 * 微信小程序登录 Real Adapter — "credentials present → live" skeleton.
 *  - endpoint : https://api.weixin.qq.com/sns/jscode2session
 *  - GET ?appid=&secret=&js_code=&grant_type=authorization_code
 */
export class WxLoginRealAdapter implements WxLoginAdapter {
  private readonly endpoint: string;

  constructor(private readonly opts: WxLoginRealOpts) {
    if (!opts.appId) throw new Error('MISCONFIGURED: WECHAT_MP_APP_ID required');
    if (!opts.appSecret) throw new Error('MISCONFIGURED: WECHAT_MP_APP_SECRET required');
    this.endpoint = opts.endpoint ?? 'https://api.weixin.qq.com/sns/jscode2session';
  }

  async jscode2session(jsCode: string): Promise<WxLoginSession> {
    if (!jsCode) throw new Error('jsCode required');
    const url = `${this.endpoint}?appid=${encodeURIComponent(this.opts.appId)}&secret=${encodeURIComponent(this.opts.appSecret)}&js_code=${encodeURIComponent(jsCode)}&grant_type=authorization_code`;
    const res = await fetch(url, { method: 'GET' });
    const txt = await res.text();
    if (!res.ok) throw new Error(`wxlogin http ${res.status}: ${txt}`);
    const json = JSON.parse(txt) as {
      openid?: string;
      session_key?: string;
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (json.errcode && json.errcode !== 0) {
      throw new Error(`wxlogin errcode=${json.errcode} msg=${json.errmsg ?? ''}`);
    }
    if (!json.openid || !json.session_key) throw new Error(`wxlogin missing fields: ${txt}`);
    return {
      openId: json.openid,
      sessionKey: json.session_key,
      unionId: json.unionid,
    };
  }
}
