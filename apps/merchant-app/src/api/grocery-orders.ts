/** GR-4 merchant 端生鲜订单(拣货流程)API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type GroceryStatus =
  | 'wait_pay'
  | 'paid'
  | 'picking'
  | 'weigh_settled'
  | 'pickup_ready'
  | 'picked_up'
  | 'cancelled'
  | 'refunded';

export interface PickingItemVo {
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
  boundQrcodeIds?: string[] | null;
  hasTraceability: number;
}

export interface PickingDetailVo {
  orderId: string;
  status: GroceryStatus;
  estimatedAmountCents: string;
  finalAmountCents?: string | null;
  weightDeltaCents?: string | null;
  pickupCode?: string | null;
  pickupPointId: string;
  pickupPointSnapshot?: { name: string; address: string } | null;
  createdAt: string;
  items: PickingItemVo[];
}

export interface PickingOrderListItemVo {
  orderId: string;
  status: GroceryStatus;
  estimatedAmountCents: string;
  finalAmountCents?: string | null;
  weightDeltaCents?: string | null;
  pickupCode?: string | null;
  pickupPointId: string;
  pickupPointName: string;
  createdAt: string;
  itemCount: number;
}

export interface PickingOrderListVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: PickingOrderListItemVo[];
}

export interface PickingMutationVo {
  orderId: string;
  status: GroceryStatus;
  updatedAt: string;
  pickupCode?: string;
  finalAmountCents?: string;
  weightDeltaCents?: string;
}

const BASE = '/api/v1/m/grocery/orders';

export function listPickingOrders(
  q: {
    status?: GroceryStatus;
    pageNo?: number;
    pageSize?: number;
  } = {},
): Promise<ApiResponse<PickingOrderListVo>> {
  return request<PickingOrderListVo>({ url: BASE, method: 'GET', params: q as Record<string, unknown> });
}

export function getPickingDetail(orderId: string): Promise<ApiResponse<PickingDetailVo>> {
  return request<PickingDetailVo>({ url: `${BASE}/${orderId}`, method: 'GET' });
}

export function startPicking(orderId: string): Promise<ApiResponse<PickingMutationVo>> {
  return request<PickingMutationVo>({ url: `${BASE}/${orderId}/start-picking`, method: 'POST' });
}

export function weighItem(
  orderId: string,
  itemId: string,
  finalWeightGrams: number,
  boundQrcodeIds?: string[],
): Promise<ApiResponse<{ itemId: string; finalLineCents: string; allWeighed: boolean }>> {
  return request({
    url: `${BASE}/${orderId}/items/${itemId}/weigh`,
    method: 'POST',
    data: { finalWeightGrams, boundQrcodeIds },
  });
}

export function settleOrder(orderId: string): Promise<ApiResponse<PickingMutationVo>> {
  return request<PickingMutationVo>({ url: `${BASE}/${orderId}/settle`, method: 'POST' });
}

export function markReady(orderId: string): Promise<ApiResponse<PickingMutationVo>> {
  return request<PickingMutationVo>({ url: `${BASE}/${orderId}/mark-ready`, method: 'POST' });
}

export function verifyPickup(orderId: string, code: string): Promise<ApiResponse<PickingMutationVo>> {
  return request<PickingMutationVo>({
    url: `${BASE}/${orderId}/verify-pickup`,
    method: 'POST',
    data: { code },
  });
}

export function cancelForOOS(orderId: string, reason: string): Promise<ApiResponse<PickingMutationVo>> {
  return request<PickingMutationVo>({
    url: `${BASE}/${orderId}/cancel-oos`,
    method: 'POST',
    data: { reason },
  });
}

export function statusLabel(s: GroceryStatus): string {
  const map: Record<GroceryStatus, string> = {
    wait_pay: '待支付',
    paid: '待拣货',
    picking: '拣货中',
    weigh_settled: '已称重',
    pickup_ready: '待自提',
    picked_up: '已完成',
    cancelled: '已取消',
    refunded: '已退款',
  };
  return map[s];
}
