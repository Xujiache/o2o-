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
  /** 不传时仅返回 PAID_WAIT_MERCHANT;传 'ALL' 不过滤;逗号分隔多个状态走 IN */
  status?: string;
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

export interface MerchantOrderItemVo {
  skuId: string;
  name: string;
  spec: string | null;
  quantity: number;
  unitPriceCents: string;
  subTotalCents: string;
}

export interface MerchantOrderAddressVo {
  consignee: string;
  mobileMasked: string;
  detail: string;
  lng: number | null;
  lat: number | null;
}

export interface MerchantOrderMapVo {
  store: { lng: number; lat: number };
  delivery: { lng: number; lat: number } | null;
  riderLocation: { lng: number; lat: number; updatedAt: number } | null;
}

export interface MerchantOrderTimelineEntryVo {
  at: number;
  fromStatus: string | null;
  toStatus: string;
  actor: string;
  reason: string | null;
}

export interface MerchantOrderDetailVo {
  orderId: string;
  orderNo: string;
  status: string;
  goodsAmountCents: string;
  deliveryFeeCents: string;
  discountAmountCents: string;
  payableAmountCents: string;
  userRemark: string | null;
  createdAt: number;
  acceptedAt: number | null;
  readyAt: number | null;
  address: MerchantOrderAddressVo | null;
  map: MerchantOrderMapVo;
  items: MerchantOrderItemVo[];
  timeline: MerchantOrderTimelineEntryVo[];
  allowedMerchantActions: string[];
}

export function getMerchantOrderDetail(orderId: string): Promise<ApiResponse<MerchantOrderDetailVo>> {
  return request({ url: `/api/v1/m/food-orders/${orderId}`, method: 'GET' });
}
