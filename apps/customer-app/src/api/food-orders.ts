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
  | 'CANCELLED'
  | 'REFUNDING'
  | 'REFUNDED'
  | 'AFTER_SALE';

export interface PreviewItemReq {
  skuId: string;
  quantity: number;
}
export interface PreviewReq {
  storeId: string;
  items: PreviewItemReq[];
  addressId: string;
  couponId?: string;
  pointsUsed?: number;
  deliveryType: 'instant' | 'reserved';
  reservedTime?: number;
}
export interface PreviewVo {
  previewId: string;
  expiresAt: number;
  goodsAmount: string;
  deliveryFee: string;
  discountAmount: string;
  payableAmount: string;
  estimatedDeliveryTime: number;
  unavailableReason?: string;
}
export interface SubmitReq {
  previewId: string;
  payChannel: 'wxpay' | 'alipay';
  remark?: string;
}
export interface SubmitVo {
  orderId: string;
  orderNo: string;
  payableAmount: string;
  expireAt: number;
}
export interface OrderListItem {
  orderId: string;
  orderNo: string;
  status: FoodOrderStatus;
  payStatus: string;
  storeId: string;
  goodsAmount: string;
  payableAmount: string;
  itemsBrief: string;
  expireAt: number;
  createdAt: number;
}
export interface OrderListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: OrderListItem[];
}
export interface OrderDetailItemVo {
  skuId: string;
  name: string;
  spec?: string | null;
  iconUrl?: string | null;
  quantity: number;
  unitPrice: string;
  subTotal: string;
}
export interface OrderTimelineEntryVo {
  fromStatus?: FoodOrderStatus | null;
  toStatus: FoodOrderStatus;
  actorType: string;
  reason?: string | null;
  createdAt: number;
}
export interface OrderPaymentBriefVo {
  payOrderId: string;
  payOrderNo: string;
  payChannel: string;
  status: string;
}
export interface OrderDetailVo {
  orderId: string;
  orderNo: string;
  status: FoodOrderStatus;
  payStatus: string;
  storeId: string;
  goodsAmount: string;
  deliveryFee: string;
  discountAmount: string;
  payableAmount: string;
  addressSnapshot: unknown;
  expireAt: number;
  paidAt?: number | null;
  cancelledAt?: number | null;
  cancelledBy?: string | null;
  cancelledReason?: string | null;
  createdAt: number;
  items: OrderDetailItemVo[];
  timeline: OrderTimelineEntryVo[];
  payment?: OrderPaymentBriefVo | null;
  actions: string[];
}

export function previewOrder(body: PreviewReq): Promise<ApiResponse<PreviewVo>> {
  return request<PreviewVo>({ url: '/api/v1/c/food/orders/preview', method: 'POST', data: body });
}
export function submitOrder(body: SubmitReq): Promise<ApiResponse<SubmitVo>> {
  return request<SubmitVo>({ url: '/api/v1/c/food/orders', method: 'POST', data: body });
}
export function listOrders(q: {
  status?: FoodOrderStatus;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<OrderListPageVo>> {
  return request<OrderListPageVo>({ url: '/api/v1/c/food/orders', method: 'GET', data: q });
}
export function getOrderDetail(orderId: string): Promise<ApiResponse<OrderDetailVo>> {
  return request<OrderDetailVo>({ url: `/api/v1/c/food/orders/${orderId}`, method: 'GET' });
}
export function cancelOrder(
  orderId: string,
  reason?: string,
): Promise<ApiResponse<{ orderId: string; status: FoodOrderStatus; cancelledAt: number }>> {
  return request({
    url: `/api/v1/c/food/orders/${orderId}/cancel`,
    method: 'POST',
    data: { reason },
  });
}
export interface ReviewReq {
  rating: number;
  content?: string;
  anonymous?: boolean;
  images?: string[];
}
// Stage 5 占位 submitReview 已迁移至 stage 7 `food-review.ts`(POST /api/v1/c/reviews)。
