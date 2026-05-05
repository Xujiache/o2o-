import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface SubmitErrandReq {
  quoteId: string;
  payChannel: 'wxpay' | 'alipay';
  remark?: string;
  attachments?: string[];
}

export interface SubmitErrandVo {
  orderId: string;
  orderNo: string;
  payOrderId: string;
  status: string;
  expireAt: number;
}

export interface ErrandOrderListItemVo {
  orderId: string;
  orderNo: string;
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  status: string;
  payableAmount: string;
  urgentLevel: 'standard' | 'fast' | 'express';
  pickupAddress: string | null;
  deliveryAddress: string;
  expireAt: number;
  createdAt: number;
}

export interface ErrandOrderListVo {
  list: ErrandOrderListItemVo[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrandOrderDetailVo extends ErrandOrderListItemVo {
  baseFee: string;
  distanceFee: string;
  urgentFee: string;
  distanceMeters: number;
  weight: string | null;
  budget: string | null;
  reservedTime: number | null;
  itemDesc: string | null;
  taskDesc: string | null;
  remark: string | null;
  pickupAddressDetail: Record<string, unknown> | null;
  deliveryAddressDetail: Record<string, unknown>;
  attachmentFileIds: string[];
  timeline: Array<{
    eventType: string;
    createdAt: number;
    operator: string;
    payload: Record<string, unknown> | null;
  }>;
  actions: string[];
  rider: { riderId: string; status: string } | null;
  paidAt: number | null;
}

export type ListStatusTab = 'ALL' | 'WAIT_PAY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export function submitErrand(body: SubmitErrandReq): Promise<ApiResponse<SubmitErrandVo>> {
  return request<SubmitErrandVo>({ url: '/api/v1/c/errand/orders', method: 'POST', data: body });
}

export function listErrandOrders(
  status: ListStatusTab = 'ALL',
  page = 1,
  pageSize = 10,
): Promise<ApiResponse<ErrandOrderListVo>> {
  return request<ErrandOrderListVo>({
    url: '/api/v1/c/errand/orders',
    method: 'GET',
    data: { status, page, pageSize },
  });
}

export function getErrandOrderDetail(orderId: string): Promise<ApiResponse<ErrandOrderDetailVo>> {
  return request<ErrandOrderDetailVo>({
    url: `/api/v1/c/errand/orders/${orderId}`,
    method: 'GET',
  });
}

export function cancelErrandOrder(
  orderId: string,
  reason?: string,
): Promise<ApiResponse<{ orderId: string; status: string }>> {
  return request({
    url: `/api/v1/c/errand/orders/${orderId}/cancel`,
    method: 'POST',
    data: { reason },
  });
}

export interface UrgentReq {
  urgentLevel: 'standard' | 'fast' | 'express';
  confirmFee: number;
}

export function urgentErrandOrder(
  orderId: string,
  body: UrgentReq,
): Promise<
  ApiResponse<{ orderId: string; urgentFee: string; urgentLevel: string; status: string; payableAmount: string }>
> {
  return request({
    url: `/api/v1/c/errand/orders/${orderId}/urgent`,
    method: 'POST',
    data: body,
  });
}

export interface RemarkReq {
  remark: string;
  attachments?: string[];
}

export function remarkErrandOrder(
  orderId: string,
  body: RemarkReq,
): Promise<ApiResponse<{ orderId: string; latestRemark: string; updatedAt: number }>> {
  return request({
    url: `/api/v1/c/errand/orders/${orderId}/remark`,
    method: 'PATCH',
    data: body,
  });
}
