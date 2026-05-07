/**
 * 跑腿订单状态机 — 严禁与外卖订单混用。
 * 当前以 `apps/server/src/database/entities/errand-order.entity.ts` 和后端已落地流转为权威。
 *
 * 主链路:
 * `WAIT_PAY -> PAID -> DISPATCHING -> ASSIGNED -> PICKED_UP -> DELIVERED -> COMPLETED`
 *
 * 异常分支:`CANCELLED`
 * 注意:`PRICE_INCREASED` 是 errand_timeline 事件,不是 errand_order.status。
 *      `ARRIVED_PICKUP`/`EXCEPTION` 属于 rider_task.status,不属于跑腿订单状态。
 */
export const ErrandOrderStatus = {
  /** 待支付 */
  WAIT_PAY: 'WAIT_PAY',
  /** 已支付,等待创建/进入调度 */
  PAID: 'PAID',
  /** 派单中 */
  DISPATCHING: 'DISPATCHING',
  /** 骑手已接单 */
  ASSIGNED: 'ASSIGNED',
  /** 已取件 */
  PICKED_UP: 'PICKED_UP',
  /** 已送达,等待用户确认 */
  DELIVERED: 'DELIVERED',
  /** 已完成 */
  COMPLETED: 'COMPLETED',
  /** 已取消 */
  CANCELLED: 'CANCELLED',
} as const;

export type ErrandOrderStatusValue = (typeof ErrandOrderStatus)[keyof typeof ErrandOrderStatus];

export const ErrandMainFlow: ErrandOrderStatusValue[] = [
  ErrandOrderStatus.WAIT_PAY,
  ErrandOrderStatus.PAID,
  ErrandOrderStatus.DISPATCHING,
  ErrandOrderStatus.ASSIGNED,
  ErrandOrderStatus.PICKED_UP,
  ErrandOrderStatus.DELIVERED,
  ErrandOrderStatus.COMPLETED,
];

export const ErrandNextStates: Record<ErrandOrderStatusValue, ErrandOrderStatusValue[]> = {
  [ErrandOrderStatus.WAIT_PAY]: [ErrandOrderStatus.PAID, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.PAID]: [ErrandOrderStatus.DISPATCHING, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.DISPATCHING]: [ErrandOrderStatus.ASSIGNED, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.ASSIGNED]: [ErrandOrderStatus.PICKED_UP, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.PICKED_UP]: [ErrandOrderStatus.DELIVERED, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.DELIVERED]: [ErrandOrderStatus.COMPLETED],
  [ErrandOrderStatus.COMPLETED]: [],
  [ErrandOrderStatus.CANCELLED]: [],
};

export const ErrandStatusDictType = 'order_errand_status';
