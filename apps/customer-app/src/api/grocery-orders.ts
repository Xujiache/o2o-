/** GR-3 customer 端生鲜订单 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type GroceryOrderStatus =
  | 'wait_pay'
  | 'paid'
  | 'picking'
  | 'weigh_settled'
  | 'pickup_ready'
  | 'picked_up'
  | 'cancelled'
  | 'refunded';

export interface GroceryOrderItemVo {
  itemId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceCentsPerJin: string;
  estimatedPerPortionGrams: number;
  portions: number;
  estimatedWeightGrams: number;
  estimatedLineCents: string;
  finalWeightGrams?: number | null;
  finalLineCents?: string | null;
  hasTraceability: number;
}

export interface PickupPointSnapshot {
  name: string;
  address: string;
  contactPhone?: string | null;
}

export interface GroceryOrderVo {
  orderId: string;
  customerId: string;
  pickupPointId: string;
  pickupPointSnapshot?: PickupPointSnapshot | null;
  status: GroceryOrderStatus;
  estimatedAmountCents: string;
  finalAmountCents?: string | null;
  weightDeltaCents?: string | null;
  estimatePaymentOrderId?: string | null;
  deltaPaymentOrderId?: string | null;
  deltaRefundOrderId?: string | null;
  pickupCode?: string | null;
  paidAt?: string | null;
  pickingStartedAt?: string | null;
  weighSettledAt?: string | null;
  pickupReadyAt?: string | null;
  pickedUpAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
  items: GroceryOrderItemVo[];
}

export interface ListGroceryOrdersVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: GroceryOrderVo[];
}

export interface GroceryOrderMutationVo {
  orderId: string;
  status: GroceryOrderStatus;
  updatedAt: string;
}

export interface SubmitGroceryOrderReq {
  pickupPointId: string;
  items: Array<{ productId: string; portions: number }>;
  remark?: string;
}

export function submitGroceryOrder(body: SubmitGroceryOrderReq): Promise<ApiResponse<GroceryOrderMutationVo>> {
  return request<GroceryOrderMutationVo>({ url: '/api/v1/c/grocery/orders', method: 'POST', data: body });
}

export function cancelGroceryOrder(orderId: string, reason?: string): Promise<ApiResponse<GroceryOrderMutationVo>> {
  return request<GroceryOrderMutationVo>({
    url: `/api/v1/c/grocery/orders/${orderId}/cancel`,
    method: 'POST',
    data: { reason },
  });
}

export function listGroceryOrders(
  q: {
    status?: GroceryOrderStatus;
    pageNo?: number;
    pageSize?: number;
  } = {},
): Promise<ApiResponse<ListGroceryOrdersVo>> {
  return request<ListGroceryOrdersVo>({
    url: '/api/v1/c/grocery/orders',
    method: 'GET',
    params: q as Record<string, unknown>,
  });
}

export function getGroceryOrder(orderId: string): Promise<ApiResponse<GroceryOrderVo>> {
  return request<GroceryOrderVo>({ url: `/api/v1/c/grocery/orders/${orderId}`, method: 'GET' });
}

export function statusLabel(s: GroceryOrderStatus): string {
  const map: Record<GroceryOrderStatus, string> = {
    wait_pay: '待支付',
    paid: '已支付',
    picking: '拣货中',
    weigh_settled: '已称重',
    pickup_ready: '待自提',
    picked_up: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  };
  return map[s];
}

export function statusTheme(s: GroceryOrderStatus): 'warn' | 'ok' | 'info' | 'err' {
  if (s === 'wait_pay') return 'warn';
  if (s === 'cancelled' || s === 'refunded') return 'err';
  if (s === 'picked_up') return 'ok';
  return 'info';
}
