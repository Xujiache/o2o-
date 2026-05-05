export interface PushOneInput {
  cid: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export interface BindDeviceInput {
  /** 业务身份(rider 或 customer 或 merchant 的 id 字符串) */
  riderId: string;
  /** 推送 SDK 给到 APP 的 device token */
  deviceToken: string;
  /** APP 端类型 */
  platform: 'android' | 'ios';
}

export interface UnbindDeviceInput {
  riderId: string;
  deviceToken: string;
}

export interface BindDeviceResult {
  success: boolean;
  providerRequestId: string;
}

export interface GetuiAdapter {
  pushOne(input: PushOneInput): Promise<{ taskId: string }>;
  pushBatch(cids: string[], title: string, body: string): Promise<{ taskId: string }>;
  /**
   * APP 推送设备绑定(stage 3 骑手上线)。
   * mock 行为:接收非空入参 → success,写 integration_request_log。
   */
  bindDevice(input: BindDeviceInput): Promise<BindDeviceResult>;
  /**
   * APP 推送设备解绑(stage 3 骑手下线 / 切换设备)。
   */
  unbindDevice(input: UnbindDeviceInput): Promise<BindDeviceResult>;
}

export class GetuiMockAdapter implements GetuiAdapter {
  async pushOne(input: PushOneInput): Promise<{ taskId: string }> {
    return { taskId: `mock-push-${input.cid.slice(0, 6)}` };
  }
  async pushBatch(_cids: string[], _title: string, _body: string): Promise<{ taskId: string }> {
    return { taskId: `mock-push-batch-${Date.now()}` };
  }
  async bindDevice(input: BindDeviceInput): Promise<BindDeviceResult> {
    if (!input.riderId.trim() || !input.deviceToken.trim()) {
      return { success: false, providerRequestId: `mock-bind-fail-${Date.now()}` };
    }
    return { success: true, providerRequestId: `mock-bind-${input.riderId.slice(-6)}-${Date.now()}` };
  }
  async unbindDevice(input: UnbindDeviceInput): Promise<BindDeviceResult> {
    if (!input.riderId.trim() || !input.deviceToken.trim()) {
      return { success: false, providerRequestId: `mock-unbind-fail-${Date.now()}` };
    }
    return { success: true, providerRequestId: `mock-unbind-${input.riderId.slice(-6)}-${Date.now()}` };
  }
}

export class GetuiRealAdapter implements GetuiAdapter {
  constructor(opts: { appId: string; appKey: string; masterSecret: string }) {
    if (!opts.appId || !opts.appKey || !opts.masterSecret) {
      throw new Error('getui credentials missing — set INTEGRATION_MODE=mock until ready');
    }
  }
  pushOne(): Promise<{ taskId: string }> {
    throw new Error('getui real adapter not implemented yet');
  }
  pushBatch(): Promise<{ taskId: string }> {
    throw new Error('getui real adapter not implemented yet');
  }
  bindDevice(): Promise<BindDeviceResult> {
    throw new Error('getui real adapter bindDevice not implemented yet (stage 3+)');
  }
  unbindDevice(): Promise<BindDeviceResult> {
    throw new Error('getui real adapter unbindDevice not implemented yet (stage 3+)');
  }
}
