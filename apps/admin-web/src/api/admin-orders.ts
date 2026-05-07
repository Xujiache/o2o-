import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type AdminOrderBizType = 'FOOD' | 'ERRAND';

export interface AdminTimelineItemVo {
  at: number;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  reason: string | null;
}

export interface AdminOperatorLogVo {
  at: number;
  operatorType: string;
  operatorId: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  summary: string | null;
}

export interface AdminDispatchLogVo {
  at: number;
  dispatchTaskId: string;
  riderId: string;
  operatorAdminId: string;
  beforeStatus: string;
  afterStatus: string;
  reason: string | null;
}

export interface AdminPaymentLogVo {
  payOrderId: string;
  payOrderNo: string;
  channel: string;
  status: string;
  paidAmount: string | null;
  paidAt: number | null;
  channelTradeNo: string | null;
}

export interface AdminOrderTimelineVo {
  timeline: AdminTimelineItemVo[];
  currentStatus: string;
  operatorLogs: AdminOperatorLogVo[];
  dispatchLogs: AdminDispatchLogVo[];
  paymentLogs: AdminPaymentLogVo[];
}

export const AdminOrdersEndpoints = {
  Timeline: (bizType: AdminOrderBizType, orderId: string): string =>
    `/api/v1/admin/orders/${bizType}/${orderId}/timeline`,
} as const;

export function getAdminOrderTimeline(
  bizType: AdminOrderBizType,
  orderId: string,
): Promise<ApiResponse<AdminOrderTimelineVo>> {
  return request<AdminOrderTimelineVo>({ url: AdminOrdersEndpoints.Timeline(bizType, orderId), method: 'GET' });
}
