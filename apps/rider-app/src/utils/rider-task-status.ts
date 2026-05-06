/** Stage 8 — 骑手任务状态字典(rider-task) */
export const STATUS_LABEL_RIDER_TASK: Record<string, string> = {
  ASSIGNED: '已接单',
  ARRIVED_PICKUP: '已到店',
  PICKED_UP: '已取货',
  DELIVERING: '配送中',
  DELIVERED: '已送达',
  EXCEPTION: '异常',
  CANCELLED: '已取消',
};

export function labelRiderTaskStatus(status: string): string {
  return STATUS_LABEL_RIDER_TASK[status] ?? status;
}

/** 当前状态可以执行的下一动作 */
export type RiderTaskAction = 'arrive-pickup' | 'pickup' | 'delivered' | 'exception';

export function nextActionsForRiderTask(status: string): RiderTaskAction[] {
  switch (status) {
    case 'ASSIGNED':
      return ['arrive-pickup', 'exception'];
    case 'ARRIVED_PICKUP':
      return ['pickup', 'exception'];
    case 'PICKED_UP':
    case 'DELIVERING':
      return ['delivered', 'exception'];
    default:
      return [];
  }
}

export const STATUS_LABEL_VIOLATION: Record<string, string> = {
  REPORTED: '已上报',
  PENDING_PLATFORM: '平台仲裁中',
  CONFIRMED: '已确认(扣款)',
  DROPPED: '已撤销',
};

export const STATUS_LABEL_WITHDRAWAL: Record<string, string> = {
  PENDING: '审核中',
  APPROVED: '处理中',
  COMPLETED: '已到账',
  REJECTED: '已驳回',
  FAILED: '失败',
};
