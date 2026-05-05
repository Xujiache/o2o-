/**
 * Stage 7 — 外卖订单状态字典(商家视角)。
 * 来源:全局状态机 + DESIGN_阶段7.md § 5.1
 */

export const STATUS_LABEL_FOOD_ORDER: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '待接单',
  MERCHANT_ACCEPTED: '已接单',
  PREPARING: '备货中',
  READY_FOR_PICKUP: '已出餐',
  RIDER_ASSIGNED: '骑手已接单',
  PICKED_UP: '已取餐',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  AFTER_SALE: '售后中',
};

export function labelOrderStatus(status: string): string {
  return STATUS_LABEL_FOOD_ORDER[status] ?? status;
}

/** 商家可执行操作映射 */
export function nextActionsForMerchant(status: string): Array<'accept' | 'reject' | 'ready'> {
  switch (status) {
    case 'PAID_WAIT_MERCHANT':
      return ['accept', 'reject'];
    case 'MERCHANT_ACCEPTED':
    case 'PREPARING':
      return ['ready'];
    default:
      return [];
  }
}
