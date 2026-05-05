/** 跑腿订单状态字典 — 前端展示用,后端枚举为唯一权威 */
export const STATUS_LABEL_ERRAND: Record<string, string> = {
  WAIT_PAY: '待支付',
  PAID: '待派单',
  DISPATCHING: '派单中',
  ASSIGNED: '骑手已接单',
  PICKED_UP: '已取货',
  DELIVERED: '已送达',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
};

export const URGENT_LABEL: Record<string, string> = {
  standard: '标准',
  fast: '加急',
  express: '特急',
};

export const TYPE_LABEL: Record<string, string> = {
  BUY: '帮我买',
  DELIVER: '帮我送',
  HELP: '帮我办',
  CUSTOM: '自定义',
};

export function statusLabel(status: string): string {
  return STATUS_LABEL_ERRAND[status] ?? status;
}

export function urgentLabel(level: string): string {
  return URGENT_LABEL[level] ?? level;
}

export function typeLabel(typeCode: string): string {
  return TYPE_LABEL[typeCode] ?? typeCode;
}
