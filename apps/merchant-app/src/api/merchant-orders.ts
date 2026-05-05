import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface MerchantOrderListItemVo {
  orderId: string;
  orderNo: string;
  status: string;
  payableAmountCents: string;
  userRemark: string | null;
  createdAt: number;
  acceptDeadline: number;
}

export interface MerchantOrderListVo {
  items: MerchantOrderListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listPendingOrders(params?: {
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<MerchantOrderListVo>> {
  return request({ url: '/api/v1/m/food-orders/pending', method: 'GET', params });
}

export interface AcceptOrderVo {
  orderId: string;
  status: string;
  acceptedAt: number;
  expectedReadyAt: number;
}

export function acceptOrder(orderId: string, expectedReadyMinutes?: number): Promise<ApiResponse<AcceptOrderVo>> {
  return request({
    url: `/api/v1/m/food-orders/${orderId}/accept`,
    method: 'POST',
    data: { expectedReadyMinutes },
  });
}

export interface RejectOrderVo {
  orderId: string;
  status: string;
  refundStatus: string;
}

export function rejectOrder(orderId: string, rejectReason: string): Promise<ApiResponse<RejectOrderVo>> {
  return request({
    url: `/api/v1/m/food-orders/${orderId}/reject`,
    method: 'POST',
    data: { rejectReason },
  });
}

export interface ReadyOrderVo {
  orderId: string;
  status: string;
  readyAt: number;
}

export function readyOrder(orderId: string, readyRemark?: string): Promise<ApiResponse<ReadyOrderVo>> {
  return request({
    url: `/api/v1/m/food-orders/${orderId}/ready`,
    method: 'POST',
    data: { readyRemark },
  });
}
