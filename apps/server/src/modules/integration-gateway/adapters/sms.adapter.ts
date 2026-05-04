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

export class SmsRealAdapter implements SmsAdapter {
  constructor(opts: { accessKeyId: string; accessKeySecret: string; signName: string }) {
    if (!opts.accessKeyId || !opts.accessKeySecret) {
      throw new Error('ali-sms credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  async send(_mobile: string, _scene: string, _code: string, _ttlMinutes?: number): Promise<SmsSendResult> {
    throw new Error('ali-sms not configured (stage 1+)');
  }
}
