import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

import type { PricingMode, WeightUnit } from './grocery-products';

export type GroceryOrderStatus =
  | 'WAIT_PAY'
  | 'PAID_WAIT_PICKUP'
  | 'SETTLING'
  | 'DIFF_PAYING'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface GroceryOrderItem {
  groceryOrderItemId: string;
  productId: string;
  productName: string;
  coverImageFileId: string | null;
  pricingMode: PricingMode;
  weightUnit: WeightUnit | null;
  unitPrice: string;
  estimatedQuantity: number;
  actualQuantity: number | null;
  estimatedSubtotal: string;
  actualSubtotal: string | null;
}

export interface PreviewGroceryOrderItemReq {
  productId: string;
  quantity: number;
}

export interface PreviewGroceryOrderReq {
  items: PreviewGroceryOrderItemReq[];
  pickupPointId: string;
  pickupSlotId: string;
  userCouponId?: string;
}

export interface PreviewGroceryOrderVo {
  previewId: string;
  expireSeconds: number;
  items: GroceryOrderItem[];
  estimatedGoodsAmount: string;
  discountAmount: string;
  estimatedPayableAmount: string;
  hasWeighedItem: boolean;
  pickupPointId: string;
  pickupSlotId: string;
  pickupDate: string;
  pickupStartMinute: number;
  pickupEndMinute: number;
}

export interface SubmitGroceryOrderReq {
  previewId: string;
  remark?: string;
}

export interface SubmitGroceryOrderVo {
  groceryOrderId: string;
  orderNo: string;
  estimatedPayableAmount: string;
  expireAt: number;
  payParams: Record<string, unknown>;
}

export interface GroceryOrderListItem {
  groceryOrderId: string;
  orderNo: string;
  status: GroceryOrderStatus;
  estimatedPayableAmount: string;
  finalPayableAmount: string | null;
  pickupDate: string;
  pickupStartMinute: number;
  pickupEndMinute: number;
  pickupPointId: string;
  itemsPreview: { productName: string; quantity: number }[];
  createdAt: number;
}

export interface GroceryOrderListPage {
  items: GroceryOrderListItem[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface GroceryOrderDetail {
  groceryOrderId: string;
  orderNo: string;
  status: GroceryOrderStatus;
  payStatus: string;
  pickupCode: string | null;
  pickupQrPayload: string | null;
  estimatedGoodsAmount: string;
  discountAmount: string;
  estimatedPayableAmount: string;
  finalGoodsAmount: string | null;
  finalPayableAmount: string | null;
  diffAmount: string | null;
  diffPayStatus: string | null;
  pickupPointId: string;
  pickupDate: string;
  pickupStartMinute: number;
  pickupEndMinute: number;
  expireAt: number;
  paidAt: number | null;
  pickedUpAt: number | null;
  items: GroceryOrderItem[];
  createdAt: number;
}

export interface ListGroceryOrdersQuery {
  status?: GroceryOrderStatus;
  pageNo?: number;
  pageSize?: number;
}

export function previewGroceryOrder(body: PreviewGroceryOrderReq): Promise<ApiResponse<PreviewGroceryOrderVo>> {
  return request<PreviewGroceryOrderVo>({
    url: '/api/v1/c/grocery/orders/preview',
    method: 'POST',
    data: body,
  });
}

export function submitGroceryOrder(body: SubmitGroceryOrderReq): Promise<ApiResponse<SubmitGroceryOrderVo>> {
  return request<SubmitGroceryOrderVo>({
    url: '/api/v1/c/grocery/orders',
    method: 'POST',
    data: body,
  });
}

export function listGroceryOrders(q: ListGroceryOrdersQuery = {}): Promise<ApiResponse<GroceryOrderListPage>> {
  return request<GroceryOrderListPage>({
    url: '/api/v1/c/grocery/orders',
    method: 'GET',
    params: q as Record<string, unknown>,
  });
}

export function getGroceryOrder(id: string): Promise<ApiResponse<GroceryOrderDetail>> {
  return request<GroceryOrderDetail>({
    url: `/api/v1/c/grocery/orders/${id}`,
    method: 'GET',
  });
}

export function cancelGroceryOrder(
  id: string,
  reason?: string,
): Promise<ApiResponse<{ groceryOrderId: string; status: GroceryOrderStatus }>> {
  return request({
    url: `/api/v1/c/grocery/orders/${id}/cancel`,
    method: 'POST',
    data: { reason },
  });
}

export function prepayGrocery(
  orderId: string,
  payChannel: 'wxpay' | 'alipay' = 'wxpay',
): Promise<ApiResponse<{ payOrderId: string; payOrderNo: string; payParams: string; expireAt: number }>> {
  return request({
    url: '/api/v1/c/payments/prepay',
    method: 'POST',
    data: { bizType: 'GROCERY', orderId, payChannel },
  });
}
