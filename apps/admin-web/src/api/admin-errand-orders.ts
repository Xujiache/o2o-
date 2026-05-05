import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type ErrandOrderStatus =
  | 'WAIT_PAY'
  | 'PAID'
  | 'DISPATCHING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ErrandTypeCode = 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';

export const AdminErrandOrderEndpoints = {
  List: '/api/v1/admin/errand-orders',
  Detail: (id: string): string => `/api/v1/admin/errand-orders/${id}`,
  Stats: '/api/v1/admin/errand-orders/stats',
} as const;

export interface AdminErrandOrderListItem {
  orderId: string;
  orderNo: string;
  customerId: string;
  typeCode: ErrandTypeCode;
  status: ErrandOrderStatus;
  payableAmount: string;
  urgentLevel: 'standard' | 'fast' | 'express';
  createdAt: number;
  paidAt: number | null;
  cancelledAt: number | null;
}

export interface AdminErrandOrderListPageVo {
  list: AdminErrandOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminErrandOrderDetailVo extends AdminErrandOrderListItem {
  pickupAddress: Record<string, unknown> | null;
  deliveryAddress: Record<string, unknown>;
  itemDesc: string | null;
  taskDesc: string | null;
  weight: string | null;
  distanceMeters: number;
  baseFee: string;
  distanceFee: string;
  urgentFee: string;
  reservedTime: number | null;
  payOrderId: string | null;
  cancelReason: string | null;
  timeline: Array<{
    eventType: string;
    operator: string;
    payload: Record<string, unknown> | null;
    createdAt: number;
  }>;
  task: {
    taskId: string;
    riderId: string | null;
    status: string;
    dispatchCount: number;
    priceIncrease: string;
  } | null;
}

export interface AdminErrandStatsVo {
  totalCount: number;
  waitPayCount: number;
  paidCount: number;
  dispatchingCount: number;
  assignedCount: number;
  deliveredCount: number;
  completedCount: number;
  cancelledCount: number;
  totalAmount: string;
}

export interface ListErrandQuery {
  status?: ErrandOrderStatus;
  customerId?: string;
  typeCode?: ErrandTypeCode;
  page?: number;
  pageSize?: number;
}

export function listErrandOrders(q: ListErrandQuery): Promise<ApiResponse<AdminErrandOrderListPageVo>> {
  return request<AdminErrandOrderListPageVo>({
    url: AdminErrandOrderEndpoints.List,
    method: 'GET',
    params: q,
  });
}

export function getErrandOrderDetail(orderId: string): Promise<ApiResponse<AdminErrandOrderDetailVo>> {
  return request<AdminErrandOrderDetailVo>({
    url: AdminErrandOrderEndpoints.Detail(orderId),
    method: 'GET',
  });
}

export function getErrandStats(): Promise<ApiResponse<AdminErrandStatsVo>> {
  return request<AdminErrandStatsVo>({ url: AdminErrandOrderEndpoints.Stats, method: 'GET' });
}
