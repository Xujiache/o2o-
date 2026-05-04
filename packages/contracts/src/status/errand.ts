/**
 * 跑腿订单状态机 — 严禁与外卖订单混用
 * 来源:`项目阶段规划/全局状态机与业务规则.md`
 *
 * `WAIT_PAY -> PAID_WAIT_RIDER -> PRICE_INCREASED -> RIDER_ASSIGNED ->
 *  WAIT_PICKUP -> PICKED_UP -> DELIVERING -> WAIT_CONFIRM -> COMPLETED`
 *
 * 异常分支:`CANCELLED` / `REFUNDING` / `REFUNDED` / `AFTER_SALE`
 */
export const ErrandOrderStatus = {
  /** 待支付 */
  WAIT_PAY: 'WAIT_PAY',
  /** 已支付,等待骑手接单 */
  PAID_WAIT_RIDER: 'PAID_WAIT_RIDER',
  /** 已自动加价(3 分钟无人接单触发) */
  PRICE_INCREASED: 'PRICE_INCREASED',
  /** 骑手已分配 */
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  /** 待取件 */
  WAIT_PICKUP: 'WAIT_PICKUP',
  /** 已取件 */
  PICKED_UP: 'PICKED_UP',
  /** 配送中 */
  DELIVERING: 'DELIVERING',
  /** 等待用户确认 */
  WAIT_CONFIRM: 'WAIT_CONFIRM',
  /** 已完成 */
  COMPLETED: 'COMPLETED',
  /** 已取消 */
  CANCELLED: 'CANCELLED',
  /** 退款中 */
  REFUNDING: 'REFUNDING',
  /** 已退款 */
  REFUNDED: 'REFUNDED',
  /** 售后中 */
  AFTER_SALE: 'AFTER_SALE',
} as const;

export type ErrandOrderStatusValue = (typeof ErrandOrderStatus)[keyof typeof ErrandOrderStatus];

export const ErrandMainFlow: ErrandOrderStatusValue[] = [
  ErrandOrderStatus.WAIT_PAY,
  ErrandOrderStatus.PAID_WAIT_RIDER,
  ErrandOrderStatus.PRICE_INCREASED,
  ErrandOrderStatus.RIDER_ASSIGNED,
  ErrandOrderStatus.WAIT_PICKUP,
  ErrandOrderStatus.PICKED_UP,
  ErrandOrderStatus.DELIVERING,
  ErrandOrderStatus.WAIT_CONFIRM,
  ErrandOrderStatus.COMPLETED,
];

export const ErrandNextStates: Record<ErrandOrderStatusValue, ErrandOrderStatusValue[]> = {
  [ErrandOrderStatus.WAIT_PAY]: [ErrandOrderStatus.PAID_WAIT_RIDER, ErrandOrderStatus.CANCELLED],
  [ErrandOrderStatus.PAID_WAIT_RIDER]: [
    ErrandOrderStatus.PRICE_INCREASED,
    ErrandOrderStatus.RIDER_ASSIGNED,
    ErrandOrderStatus.CANCELLED,
    ErrandOrderStatus.REFUNDING,
  ],
  [ErrandOrderStatus.PRICE_INCREASED]: [
    ErrandOrderStatus.RIDER_ASSIGNED,
    ErrandOrderStatus.CANCELLED,
    ErrandOrderStatus.REFUNDING,
  ],
  [ErrandOrderStatus.RIDER_ASSIGNED]: [ErrandOrderStatus.WAIT_PICKUP, ErrandOrderStatus.REFUNDING],
  [ErrandOrderStatus.WAIT_PICKUP]: [ErrandOrderStatus.PICKED_UP, ErrandOrderStatus.AFTER_SALE],
  [ErrandOrderStatus.PICKED_UP]: [ErrandOrderStatus.DELIVERING, ErrandOrderStatus.AFTER_SALE],
  [ErrandOrderStatus.DELIVERING]: [ErrandOrderStatus.WAIT_CONFIRM, ErrandOrderStatus.AFTER_SALE],
  [ErrandOrderStatus.WAIT_CONFIRM]: [ErrandOrderStatus.COMPLETED, ErrandOrderStatus.AFTER_SALE],
  [ErrandOrderStatus.COMPLETED]: [ErrandOrderStatus.AFTER_SALE],
  [ErrandOrderStatus.CANCELLED]: [],
  [ErrandOrderStatus.REFUNDING]: [ErrandOrderStatus.REFUNDED],
  [ErrandOrderStatus.REFUNDED]: [],
  [ErrandOrderStatus.AFTER_SALE]: [ErrandOrderStatus.REFUNDING, ErrandOrderStatus.COMPLETED],
};

export const ErrandStatusDictType = 'order_errand_status';
