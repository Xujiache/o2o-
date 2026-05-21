import type { Scope } from '@o2o/contracts';

/**
 * WS Topic 命名空间式权限模型。
 *
 * 支持的 topic 格式:
 *   customer:order:<orderId>     — 客户订阅其本人订单
 *   merchant:store:<storeId>     — 商家订阅本人门店事件
 *   rider:hall:<cityCode>        — 已审核骑手订阅本同城派单大厅
 *   rider:task:<taskId>          — 骑手订阅本人任务进度
 *   admin:dispatch               — admin 订阅平台调度
 */
export type ParsedTopic =
  | { kind: 'customer-order'; orderId: string }
  | { kind: 'merchant-store'; storeId: string }
  | { kind: 'rider-hall'; cityCode: string }
  | { kind: 'rider-task'; taskId: string }
  | { kind: 'admin-dispatch' };

const TOPIC_PATTERN_LIMIT = 128;

/** 解析 topic 字符串;非法格式返回 null。 */
export function parseTopic(topic: string): ParsedTopic | null {
  if (!topic || typeof topic !== 'string' || topic.length > TOPIC_PATTERN_LIMIT) return null;
  const parts = topic.split(':');
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a && b && c) {
      if (a === 'customer' && b === 'order' && /^\d+$/.test(c)) {
        return { kind: 'customer-order', orderId: c };
      }
      if (a === 'merchant' && b === 'store' && /^\d+$/.test(c)) {
        return { kind: 'merchant-store', storeId: c };
      }
      if (a === 'rider' && b === 'hall' && /^[A-Z0-9_-]{1,16}$/i.test(c)) {
        return { kind: 'rider-hall', cityCode: c };
      }
      if (a === 'rider' && b === 'task' && /^\d+$/.test(c)) {
        return { kind: 'rider-task', taskId: c };
      }
    }
  }
  if (parts.length === 2 && parts[0] === 'admin' && parts[1] === 'dispatch') {
    return { kind: 'admin-dispatch' };
  }
  return null;
}

/** 静态(无需查库)的 scope 级别访问检查 — 真正的 ownership 校验留给 service 异步执行。 */
export function isScopeAllowedForTopic(scope: Scope, parsed: ParsedTopic): boolean {
  switch (parsed.kind) {
    case 'customer-order':
      return scope === 'customer' || scope === 'admin';
    case 'merchant-store':
      return scope === 'merchant' || scope === 'admin';
    case 'rider-hall':
    case 'rider-task':
      return scope === 'rider' || scope === 'admin';
    case 'admin-dispatch':
      return scope === 'admin';
  }
}

// === 服务端推消息时使用的 topic 构造工具 ===

export const TopicBuilder = {
  customerOrder: (orderId: string | number): string => `customer:order:${orderId}`,
  merchantStore: (storeId: string | number): string => `merchant:store:${storeId}`,
  riderHall: (cityCode: string): string => `rider:hall:${cityCode}`,
  riderTask: (taskId: string | number): string => `rider:task:${taskId}`,
  adminDispatch: (): string => 'admin:dispatch',
};
