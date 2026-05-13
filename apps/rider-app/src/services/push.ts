/**
 * 推送 service:个推 SDK 集成 + clientId/cid 注册。
 *
 * 后端接口:
 *   - POST /api/v1/r/push/bind { clientId, deviceId, platform } → 绑定 cid 到骑手
 *   - POST /api/v1/r/push/unbind { clientId } → 注销
 */

export interface PushService {
  /** 初始化个推 SDK(读取 manifest 中的 appKey) */
  init(): Promise<void>;
  /** 取个推分配的 clientId(cid);未初始化返回 null */
  getClientId(): Promise<string | null>;
  /** 把 cid 绑定到当前骑手(后端持久化) */
  bind(): Promise<void>;
  /** 注销绑定 */
  unbind(): Promise<void>;
  /** 注册透传消息回调 */
  onMessage(handler: (payload: PushMessage) => void): void;
  offMessage(): void;
}

export interface PushMessage {
  /** 消息类型:外卖订单/跑腿单/系统通知 */
  type: string;
  title: string;
  content: string;
  /** 业务携带数据 */
  data?: Record<string, unknown>;
  receivedAt: number;
}

class MockPushService implements PushService {
  private cid: string | null = null;
  private handler: ((m: PushMessage) => void) | null = null;

  async init(): Promise<void> {
    // 初始化推送客户端。
    this.cid = `mock-cid-${Date.now()}`;
  }

  async getClientId(): Promise<string | null> {
    return this.cid;
  }

  async bind(): Promise<void> {
    // 绑定推送客户端。
  }

  async unbind(): Promise<void> {
    // 解绑推送客户端。
  }

  onMessage(handler: (payload: PushMessage) => void): void {
    // 注册推送消息回调。
    this.handler = handler;
  }

  offMessage(): void {
    this.handler = null;
  }
}

export const pushService: PushService = new MockPushService();
