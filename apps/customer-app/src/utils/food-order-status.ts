export const FOOD_STATUS_LABEL: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID_WAIT_MERCHANT: '等待商家接单',
  MERCHANT_ACCEPTED: '商家已接单',
  PREPARING: '备餐中',
  READY_FOR_PICKUP: '待骑手取餐',
  RIDER_ASSIGNED: '骑手已接单',
  PICKED_UP: '已取餐',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  REFUNDING: '退款中',
  REFUNDED: '已退款',
  AFTER_SALE: '售后处理中',
};

export function foodStatusLabel(status: string): string {
  return FOOD_STATUS_LABEL[status] ?? '状态更新中';
}

export function actorLabel(actor: string | null | undefined): string {
  const map: Record<string, string> = {
    customer: '用户',
    merchant: '商家',
    rider: '骑手',
    admin: '平台',
    system: '系统',
  };
  return actor ? (map[actor] ?? '系统') : '系统';
}
