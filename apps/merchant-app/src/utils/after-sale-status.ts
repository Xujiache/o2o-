/**
 * Stage 7 — 售后单状态字典。
 */

export const STATUS_LABEL_AFTER_SALE: Record<string, string> = {
  PENDING_MERCHANT: '待商家审核',
  APPROVED_BY_MERCHANT: '商家已通过',
  REJECTED_BY_MERCHANT: '商家已驳回',
  PENDING_PLATFORM: '平台仲裁中',
  COMPLETED: '已完成',
  REFUNDED: '已退款',
  CANCELLED: '已取消',
};

export function labelAfterSaleStatus(status: string): string {
  return STATUS_LABEL_AFTER_SALE[status] ?? status;
}

export const STATUS_LABEL_SETTLEMENT: Record<string, string> = {
  PENDING: '待结算',
  READY: '可提现',
  PAID: '已打款',
  FAILED: '失败',
};

export const STATUS_LABEL_WITHDRAWAL: Record<string, string> = {
  PENDING: '审核中',
  APPROVED: '处理中',
  COMPLETED: '已到账',
  REJECTED: '已驳回',
  FAILED: '失败',
};
