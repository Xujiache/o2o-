/**
 * 商家端 — 生鲜商城 / 自提点 / 核销 / 称重 接口封装
 *
 * 与后端契约对齐:
 *  - GET  /api/v1/m/grocery/products              listProducts
 *  - POST /api/v1/m/grocery/products              createProduct
 *  - PUT  /api/v1/m/grocery/products/:id          updateProduct
 *  - PATCH/api/v1/m/grocery/products/:id/shelf    setShelf
 *  - GET  /api/v1/m/pickup-points                 listPickupPoints
 *  - POST /api/v1/m/pickup-points                 createPickupPoint
 *  - PATCH/api/v1/m/pickup-points/:id             updatePickupPoint
 *  - GET  /api/v1/m/pickup-points/:id/slots       listPickupSlots
 *  - POST /api/v1/m/pickup-points/:id/slots/batch batchConfigSlots
 *  - POST /api/v1/m/pickup/verify                 verifyPickup
 *  - GET  /api/v1/m/pickup/verify-logs            listVerifyLogs
 *  - POST /api/v1/m/pickup/weigh                  weighItems
 *  - POST /api/v1/m/pickup/weigh/confirm          confirmSettle
 *  - POST /api/v1/m/pickup/finalize               finalizePickup
 *
 * 金额单位:bigint 字符串(分);时间:bigint 毫秒;时段:当日分钟 0-1440
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type GroceryPricingMode = 'fixed' | 'weighed';
export type GroceryWeightUnit = 'jin' | 'kg' | 'g';
export type GrocerySaleStatus = 'on_shelf' | 'off_shelf';

// =================== 商品 ===================

export interface GroceryProductItemVo {
  productId: string;
  storeId: string;
  categoryId: string;
  name: string;
  coverImageFileId: string | null;
  pricingMode: GroceryPricingMode;
  weightUnit: GroceryWeightUnit | null;
  /** fixed: 售价(分/份);weighed: 0(看 unitPricePerJin) */
  price: string;
  /** 每斤价(分),称重商品用 */
  unitPricePerJin: string | null;
  minWeightG: number | null;
  maxWeightG: number | null;
  stock: number;
  sales: number;
}

export interface GroceryProductDetailVo extends GroceryProductItemVo {
  description: string | null;
  images: string[] | null;
}

export interface GroceryProductPageVo {
  items: GroceryProductItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface UpsertGroceryProductReq {
  categoryId: string;
  name: string;
  description?: string;
  coverImageFileId?: string;
  images?: string[];
  pricingMode: GroceryPricingMode;
  /** fixed 时必传:售价(分/份) */
  price?: number;
  /** weighed 时必传:每斤价(分) */
  unitPricePerJin?: number;
  weightUnit?: GroceryWeightUnit;
  minWeightG?: number;
  maxWeightG?: number;
  stock: number;
}

export function listGroceryProducts(params: {
  categoryId?: string;
  keyword?: string;
  sort?: 'sales' | 'price_asc' | 'price_desc' | 'new';
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<GroceryProductPageVo>> {
  return request<GroceryProductPageVo>({
    url: '/api/v1/m/grocery/products',
    method: 'GET',
    params,
  });
}

export function createGroceryProduct(body: UpsertGroceryProductReq): Promise<ApiResponse<GroceryProductItemVo>> {
  return request<GroceryProductItemVo>({
    url: '/api/v1/m/grocery/products',
    method: 'POST',
    data: body as never,
  });
}

export function updateGroceryProduct(
  productId: string,
  body: UpsertGroceryProductReq,
): Promise<ApiResponse<GroceryProductItemVo>> {
  return request<GroceryProductItemVo>({
    url: `/api/v1/m/grocery/products/${productId}`,
    method: 'PUT',
    data: body as never,
  });
}

export function setGroceryProductShelf(
  productId: string,
  saleStatus: GrocerySaleStatus,
): Promise<ApiResponse<{ productId: string; saleStatus: string }>> {
  return request({
    url: `/api/v1/m/grocery/products/${productId}/shelf`,
    method: 'PATCH' as const,
    data: { saleStatus } as never,
  });
}

// =================== 自提点 ===================

export interface PickupPointVo {
  pickupPointId: string;
  merchantId: string;
  storeId: string | null;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  lng: number;
  lat: number;
  status: number;
}

export interface CreatePickupPointReq {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  lng: number;
  lat: number;
  storeId?: string;
}

export type UpdatePickupPointReq = Partial<CreatePickupPointReq> & { status?: number };

export function listPickupPoints(): Promise<ApiResponse<PickupPointVo[]>> {
  return request<PickupPointVo[]>({ url: '/api/v1/m/pickup-points', method: 'GET' });
}

export function createPickupPoint(body: CreatePickupPointReq): Promise<ApiResponse<PickupPointVo>> {
  return request<PickupPointVo>({
    url: '/api/v1/m/pickup-points',
    method: 'POST',
    data: body as never,
  });
}

export function updatePickupPoint(
  pickupPointId: string,
  body: UpdatePickupPointReq,
): Promise<ApiResponse<PickupPointVo>> {
  return request<PickupPointVo>({
    url: `/api/v1/m/pickup-points/${pickupPointId}`,
    method: 'PATCH' as const,
    data: body as never,
  });
}

export interface PickupSlotVo {
  slotId: string;
  pickupPointId: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  capacity: number;
  reserved: number;
  remain: number;
}

export function listPickupSlots(pickupPointId: string, from: string, to: string): Promise<ApiResponse<PickupSlotVo[]>> {
  return request<PickupSlotVo[]>({
    url: `/api/v1/m/pickup-points/${pickupPointId}/slots`,
    method: 'GET',
    params: { from, to },
  });
}

export interface BatchConfigSlotsReq {
  startDate: string;
  days: number;
  slots: Array<{ startMinute: number; endMinute: number; capacity: number }>;
  overwrite?: boolean;
}

export function batchConfigPickupSlots(
  pickupPointId: string,
  body: BatchConfigSlotsReq,
): Promise<ApiResponse<{ created: number; skipped: number; updated: number }>> {
  return request({
    url: `/api/v1/m/pickup-points/${pickupPointId}/slots/batch`,
    method: 'POST',
    data: body as never,
  });
}

// =================== 核销 ===================

export interface VerifiedOrderItemVo {
  groceryOrderItemId: string;
  productId: string;
  productName: string;
  pricingMode: GroceryPricingMode;
  weightUnit: GroceryWeightUnit | null;
  unitPrice: string;
  estimatedQuantity: number;
  actualQuantity: number | null;
  estimatedSubtotal: string;
  actualSubtotal: string | null;
}

export interface VerifyPickupVo {
  groceryOrderId: string;
  orderNo: string;
  status: string;
  pickupPointId: string;
  pickupDate: string;
  pickupStartMinute: number;
  pickupEndMinute: number;
  needsWeighing: boolean;
  items: VerifiedOrderItemVo[];
  estimatedPayableAmount: string;
  finalPayableAmount: string | null;
}

export function verifyPickup(body: { pickupCode?: string; qrPayload?: string }): Promise<ApiResponse<VerifyPickupVo>> {
  return request<VerifyPickupVo>({
    url: '/api/v1/m/pickup/verify',
    method: 'POST',
    data: body as never,
  });
}

export interface VerifyLogVo {
  verifyLogId: string;
  groceryOrderId: string | null;
  orderNo: string;
  pickupPointId: string;
  operatorId: string;
  operatorName: string | null;
  verifyMethod: number;
  result: number;
  failReason: string | null;
  createdAt: number;
}

export interface VerifyLogsPageVo {
  items: VerifyLogVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listVerifyLogs(params: {
  pickupPointId?: string;
  fromDate?: string;
  toDate?: string;
  result?: '1' | '0';
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<VerifyLogsPageVo>> {
  return request<VerifyLogsPageVo>({
    url: '/api/v1/m/pickup/verify-logs',
    method: 'GET',
    params,
  });
}

// =================== 称重 / 结算 ===================

export interface WeighItemsReq {
  groceryOrderId: string;
  items: Array<{ groceryOrderItemId: string; actualG: number }>;
}

export interface WeighItemsVo {
  groceryOrderId: string;
  items: Array<{ groceryOrderItemId: string; actualQuantity: number; actualSubtotal: string }>;
  finalGoodsAmount: string;
  finalPayableAmount: string;
  /** final - estimated;正=补付 负=退款 0=无 */
  diffAmount: string;
}

export function weighItems(body: WeighItemsReq): Promise<ApiResponse<WeighItemsVo>> {
  return request<WeighItemsVo>({
    url: '/api/v1/m/pickup/weigh',
    method: 'POST',
    data: body as never,
  });
}

export type SettleAction = 'AUTO_DONE' | 'NEEDS_DIFF_PAY' | 'AUTO_REFUND';

export interface ConfirmSettleVo {
  groceryOrderId: string;
  finalPayableAmount: string;
  diffAmount: string;
  action: SettleAction;
  status: string;
}

export function confirmSettle(groceryOrderId: string): Promise<ApiResponse<ConfirmSettleVo>> {
  return request<ConfirmSettleVo>({
    url: '/api/v1/m/pickup/weigh/confirm',
    method: 'POST',
    data: { groceryOrderId } as never,
  });
}

export interface FinalizeVo {
  groceryOrderId: string;
  status: string;
}

export function finalizePickup(groceryOrderId: string): Promise<ApiResponse<FinalizeVo>> {
  return request<FinalizeVo>({
    url: '/api/v1/m/pickup/finalize',
    method: 'POST',
    data: { groceryOrderId } as never,
  });
}
