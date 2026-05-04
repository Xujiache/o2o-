export interface SmsAdapter {
  sendCode(phone: string, code: string, ttlMinutes: number): Promise<void>;
  sendNotification(phone: string, templateCode: string, params: Record<string, string>): Promise<void>;
}

export class SmsMockAdapter implements SmsAdapter {
  async sendCode(phone: string, code: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.info(`[sms-mock] code to ${phone.slice(0, 3)}****${phone.slice(-4)}: ${code}`);
  }
  async sendNotification(): Promise<void> {
    /* no-op */
  }
}

export class SmsRealAdapter implements SmsAdapter {
  constructor(opts: { accessKeyId: string; accessKeySecret: string; signName: string }) {
    if (!opts.accessKeyId || !opts.accessKeySecret) {
      throw new Error('sms credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  sendCode(): Promise<void> {
    throw new Error('sms real adapter not implemented yet');
  }
  sendNotification(): Promise<void> {
    throw new Error('sms real adapter not implemented yet');
  }
}
