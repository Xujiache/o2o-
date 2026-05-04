/**
 * 外卖订单状态机 — 严禁与跑腿订单混用
 * 来源:`项目阶段规划/全局状态机与业务规则.md`
 *
 * `WAIT_PAY -> PAID_WAIT_MERCHANT -> MERCHANT_ACCEPTED -> PREPARING ->
 *  READY_FOR_PICKUP -> RIDER_ASSIGNED -> PICKED_UP -> DELIVERING ->
 *  DELIVERED -> COMPLETED`
 *
 * 异常分支:`CANCELLED` / `REFUNDING` / `REFUNDED` / `AFTER_SALE`
 */
export const TakeawayOrderStatus = {
  /** 待支付 */
  WAIT_PAY: 'WAIT_PAY',
  /** 已支付,等待商家接单 */
  PAID_WAIT_MERCHANT: 'PAID_WAIT_MERCHANT',
  /** 商家已接单 */
  MERCHANT_ACCEPTED: 'MERCHANT_ACCEPTED',
  /** 制作中 */
  PREPARING: 'PREPARING',
  /** 待取餐 */
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  /** 骑手已分配 */
  RIDER_ASSIGNED: 'RIDER_ASSIGNED',
  /** 已取餐 */
  PICKED_UP: 'PICKED_UP',
  /** 配送中 */
  DELIVERING: 'DELIVERING',
  /** 已送达 */
  DELIVERED: 'DELIVERED',
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

export type TakeawayOrderStatusValue = (typeof TakeawayOrderStatus)[keyof typeof TakeawayOrderStatus];

/** 主流程顺序(不含异常分支) */
export const TakeawayMainFlow: TakeawayOrderStatusValue[] = [
  TakeawayOrderStatus.WAIT_PAY,
  TakeawayOrderStatus.PAID_WAIT_MERCHANT,
  TakeawayOrderStatus.MERCHANT_ACCEPTED,
  TakeawayOrderStatus.PREPARING,
  TakeawayOrderStatus.READY_FOR_PICKUP,
  TakeawayOrderStatus.RIDER_ASSIGNED,
  TakeawayOrderStatus.PICKED_UP,
  TakeawayOrderStatus.DELIVERING,
  TakeawayOrderStatus.DELIVERED,
  TakeawayOrderStatus.COMPLETED,
];

/** 状态可流转目标(参考用,后端为权威) */
export const TakeawayNextStates: Record<TakeawayOrderStatusValue, TakeawayOrderStatusValue[]> = {
  [TakeawayOrderStatus.WAIT_PAY]: [TakeawayOrderStatus.PAID_WAIT_MERCHANT, TakeawayOrderStatus.CANCELLED],
  [TakeawayOrderStatus.PAID_WAIT_MERCHANT]: [
    TakeawayOrderStatus.MERCHANT_ACCEPTED,
    TakeawayOrderStatus.CANCELLED,
    TakeawayOrderStatus.REFUNDING,
  ],
  [TakeawayOrderStatus.MERCHANT_ACCEPTED]: [TakeawayOrderStatus.PREPARING, TakeawayOrderStatus.REFUNDING],
  [TakeawayOrderStatus.PREPARING]: [TakeawayOrderStatus.READY_FOR_PICKUP, TakeawayOrderStatus.REFUNDING],
  [TakeawayOrderStatus.READY_FOR_PICKUP]: [TakeawayOrderStatus.RIDER_ASSIGNED, TakeawayOrderStatus.REFUNDING],
  [TakeawayOrderStatus.RIDER_ASSIGNED]: [TakeawayOrderStatus.PICKED_UP, TakeawayOrderStatus.REFUNDING],
  [TakeawayOrderStatus.PICKED_UP]: [TakeawayOrderStatus.DELIVERING, TakeawayOrderStatus.AFTER_SALE],
  [TakeawayOrderStatus.DELIVERING]: [TakeawayOrderStatus.DELIVERED, TakeawayOrderStatus.AFTER_SALE],
  [TakeawayOrderStatus.DELIVERED]: [TakeawayOrderStatus.COMPLETED, TakeawayOrderStatus.AFTER_SALE],
  [TakeawayOrderStatus.COMPLETED]: [TakeawayOrderStatus.AFTER_SALE],
  [TakeawayOrderStatus.CANCELLED]: [],
  [TakeawayOrderStatus.REFUNDING]: [TakeawayOrderStatus.REFUNDED],
  [TakeawayOrderStatus.REFUNDED]: [],
  [TakeawayOrderStatus.AFTER_SALE]: [TakeawayOrderStatus.REFUNDING, TakeawayOrderStatus.COMPLETED],
};

/** 字典 dict_type */
export const TakeawayStatusDictType = 'order_takeaway_status';
