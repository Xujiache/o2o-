import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type FoodOrderStatus =
  | 'WAIT_PAY'
  | 'PAID_WAIT_MERCHANT'
  | 'MERCHANT_ACCEPTED'
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERING'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export const AdminFoodOrderEndpoints = {
  List: '/api/v1/admin/food-orders',
  Detail: (id: string): string => `/api/v1/admin/food-orders/${id}`,
  Stats: '/api/v1/admin/food-orders/timeline-statistics',
} as const;

export interface AdminFoodOrderListItem {
  orderId: string;
  orderNo: string;
  status: FoodOrderStatus;
  payStatus: string;
  customerId: string;
  storeId: string;
  cityCode: string;
  payableAmount: string;
  expireAt: number;
  createdAt: number;
}
export interface AdminFoodOrderListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: AdminFoodOrderListItem[];
}

export interface AdminFoodOrderDetailVo {
  orderId: string;
  orderNo: string;
  status: FoodOrderStatus;
  payStatus: string;
  customerId: string;
  storeId: string;
  cityCode: string;
  goodsAmount: string;
  deliveryFee: string;
  payableAmount: string;
  expireAt: number;
  paidAt?: number | null;
  cancelledAt?: number | null;
  cancelledBy?: string | null;
  cancelledReason?: string | null;
  createdAt: number;
  timeline: Array<{
    fromStatus?: FoodOrderStatus | null;
    toStatus: FoodOrderStatus;
    actorType: string;
    reason?: string | null;
    createdAt: number;
  }>;
  payment?: {
    payOrderId: string;
    payOrderNo: string;
    payChannel: string;
    status: string;
    channelTradeNo?: string | null;
    paidAt?: number | null;
  } | null;
}

export interface TimelineStatsVo {
  waitPayOverdueCount: number;
  merchantAcceptOverdueCount: number;
  deliveringCount: number;
  completedTodayCount: number;
  cancelledTodayCount: number;
}

export interface ListQuery {
  status?: FoodOrderStatus;
  cityCode?: string;
  payChannel?: string;
  customerId?: string;
  storeId?: string;
  pageNo?: number;
  pageSize?: number;
}

export function listFoodOrders(q: ListQuery): Promise<ApiResponse<AdminFoodOrderListPageVo>> {
  return request<AdminFoodOrderListPageVo>({ url: AdminFoodOrderEndpoints.List, method: 'GET', params: q });
}

export function getFoodOrderDetail(orderId: string): Promise<ApiResponse<AdminFoodOrderDetailVo>> {
  return request<AdminFoodOrderDetailVo>({ url: AdminFoodOrderEndpoints.Detail(orderId), method: 'GET' });
}

export function getTimelineStats(): Promise<ApiResponse<TimelineStatsVo>> {
  return request<TimelineStatsVo>({ url: AdminFoodOrderEndpoints.Stats, method: 'GET' });
}
