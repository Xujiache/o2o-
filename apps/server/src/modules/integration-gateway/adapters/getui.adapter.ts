import { createHash } from 'node:crypto';

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

export interface GetuiRealOpts {
  appId: string;
  appKey: string;
  masterSecret: string;
}

interface TokenCache {
  token: string;
  expireAt: number;
}

/**
 * Getui Real Adapter — "credentials present → live" skeleton.
 *  - auth-token : POST https://restapi.getui.com/v2/${appId}/auth   (sha256(appkey + ts + mastersecret))
 *  - pushOne    : POST /v2/${appId}/push/single/cid
 *  - pushBatch  : POST /v2/${appId}/push/list/cid (先 create_msg 再 list/cid)
 *  - bind       : POST /v2/${appId}/user/alias
 *  - unbind     : DELETE /v2/${appId}/user/alias/${alias}/${cid}
 * token 缓存:1h(简单内存 TTL;迁 Redis 时通过 IntegrationGatewayService 注入)
 */
export class GetuiRealAdapter implements GetuiAdapter {
  private static readonly BASE = 'https://restapi.getui.com';
  private tokenCache: TokenCache | null = null;

  constructor(private readonly opts: GetuiRealOpts) {
    this.requireKey('GETUI_APP_ID', opts.appId);
    this.requireKey('GETUI_APP_KEY', opts.appKey);
    this.requireKey('GETUI_MASTER_SECRET', opts.masterSecret);
  }

  private requireKey(name: string, val: string | undefined): void {
    if (!val) throw new Error(`MISCONFIGURED: ${name} required`);
  }

  /** Get token (cached 50min) */
  private async getToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expireAt > now + 60_000) return this.tokenCache.token;
    const ts = String(now);
    const sign = createHash('sha256').update(`${this.opts.appKey}${ts}${this.opts.masterSecret}`).digest('hex');
    const res = await fetch(`${GetuiRealAdapter.BASE}/v2/${this.opts.appId}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sign, timestamp: ts, appkey: this.opts.appKey }),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`getui auth http ${res.status}: ${txt}`);
    const json = JSON.parse(txt) as { data?: { token?: string; expire_time?: string }; code?: number; msg?: string };
    const token = json.data?.token;
    if (!token) throw new Error(`getui auth missing token: ${txt}`);
    // expire_time 单位为 ms,默认 24h;保守取 1h 缓存
    this.tokenCache = { token, expireAt: now + 60 * 60 * 1000 };
    return token;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${GetuiRealAdapter.BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', token },
      body: JSON.stringify(body),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`getui POST ${path} http ${res.status}: ${txt}`);
    return JSON.parse(txt) as T;
  }

  private async del<T>(path: string): Promise<T> {
    const token = await this.getToken();
    const res = await fetch(`${GetuiRealAdapter.BASE}${path}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', token },
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`getui DELETE ${path} http ${res.status}: ${txt}`);
    return JSON.parse(txt) as T;
  }

  async pushOne(input: PushOneInput): Promise<{ taskId: string }> {
    const body = {
      request_id: `req_${Date.now()}_${input.cid.slice(0, 6)}`,
      audience: { cid: [input.cid] },
      push_message: {
        notification: { title: input.title, body: input.body, click_type: 'intent' },
      },
      push_channel: {
        android: { ups: { notification: { title: input.title, body: input.body } } },
        ios: { aps: { alert: { title: input.title, body: input.body } } },
      },
      data: input.payload ?? {},
    };
    const json = await this.post<{ data?: Record<string, string>; code?: number; msg?: string }>(
      `/v2/${this.opts.appId}/push/single/cid`,
      body,
    );
    const taskId = Object.values(json.data ?? {})[0] ?? `gt_${Date.now()}`;
    return { taskId };
  }

  async pushBatch(cids: string[], title: string, body: string): Promise<{ taskId: string }> {
    // 步骤1:create_msg
    const requestId = `req_${Date.now()}`;
    const msg = await this.post<{ data?: { taskid?: string }; code?: number; msg?: string }>(
      `/v2/${this.opts.appId}/push/list/message`,
      {
        request_id: requestId,
        settings: { ttl: 3600_000 },
        push_message: { notification: { title, body, click_type: 'intent' } },
      },
    );
    const taskid = msg.data?.taskid;
    if (!taskid) throw new Error(`getui create batch msg missing taskid: ${JSON.stringify(msg)}`);
    // 步骤2:list/cid
    await this.post(`/v2/${this.opts.appId}/push/list/cid`, {
      audience: { cid: cids },
      taskid,
      is_async: true,
    });
    return { taskId: taskid };
  }

  async bindDevice(input: BindDeviceInput): Promise<BindDeviceResult> {
    const reqId = `bind_${input.riderId}_${Date.now()}`;
    await this.post(`/v2/${this.opts.appId}/user/alias`, {
      data_list: [{ cid: input.deviceToken, alias: input.riderId }],
    });
    return { success: true, providerRequestId: reqId };
  }

  async unbindDevice(input: UnbindDeviceInput): Promise<BindDeviceResult> {
    const reqId = `unbind_${input.riderId}_${Date.now()}`;
    await this.del(
      `/v2/${this.opts.appId}/user/alias/${encodeURIComponent(input.riderId)}/${encodeURIComponent(input.deviceToken)}`,
    );
    return { success: true, providerRequestId: reqId };
  }
}
