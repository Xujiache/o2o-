/** GR-2 / GR-6 customer 端生鲜商品/分类 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface GroceryCategoryVo {
  categoryId: string;
  name: string;
  iconFileId?: string | null;
  displayOrder: number;
  status: 'active' | 'inactive';
}

export type GroceryPricedBy = 'weight' | 'piece' | 'sku';
export type GroceryPriceDisplayRule = 'starting' | 'range' | 'uniform';
export type GroceryDeliveryMethod = 'self_pickup' | 'city_delivery' | 'express' | 'pickup_point';

export const GROCERY_DELIVERY_METHOD_LABELS: Record<GroceryDeliveryMethod, string> = {
  self_pickup: '到店自提',
  city_delivery: '同城配送',
  express: '快递发货',
  pickup_point: '自提点',
};

export const GROCERY_DELIVERY_METHOD_ICONS: Record<GroceryDeliveryMethod, string> = {
  self_pickup: '🏬',
  city_delivery: '🛵',
  express: '📦',
  pickup_point: '📍',
};

export interface GrocerySkuVo {
  skuId: string;
  specValue: string;
  /** 单 SKU 售价(分) */
  priceCents: string;
  /** 单 SKU 库存(斤或件) */
  stockJin: string;
  weightGrams?: number | null;
  displayOrder: number;
}

export interface GroceryProductVo {
  productId: string;
  categoryId: string;
  name: string;
  coverImageFileId?: string | null;
  mainImageFileIds?: string[] | null;
  detailImageFileIds?: string[] | null;
  mainImageUrls: string[];
  detailImageUrls: string[];
  coverImageUrl?: string | null;
  description?: string | null;
  tags?: string[] | null;
  isWeighted: number;
  pricedBy: GroceryPricedBy;
  /** 单价:分/斤(weight) 或 单价:分/件(piece);sku 模式忽略 */
  unitPriceCentsPerJin: string;
  estimatedWeightGrams: number;
  stockJin: string;
  deliveryMethods?: GroceryDeliveryMethod[] | null;
  priceDisplayRule: GroceryPriceDisplayRule;
  /** 区间价的最低 / 最高(分),仅 SKU+range 时有值 */
  priceFromCents?: string | null;
  priceToCents?: string | null;
  skus: GrocerySkuVo[];
  saleStatus: 'on_shelf' | 'off_shelf' | 'sold_out';
  hasTraceability: number;
}

export interface ListGroceryCategoriesVo {
  list: GroceryCategoryVo[];
}

export interface ListGroceryProductsVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: GroceryProductVo[];
}

export function listGroceryCategories(): Promise<ApiResponse<ListGroceryCategoriesVo>> {
  return request<ListGroceryCategoriesVo>({
    url: '/api/v1/pub/grocery/categories',
    method: 'GET',
    authRequired: false,
  });
}

export function listGroceryProducts(
  q: {
    keyword?: string;
    categoryId?: string;
    pageNo?: number;
    pageSize?: number;
  } = {},
): Promise<ApiResponse<ListGroceryProductsVo>> {
  return request<ListGroceryProductsVo>({
    url: '/api/v1/pub/grocery/products',
    method: 'GET',
    params: q as Record<string, unknown>,
    authRequired: false,
  });
}

export function getGroceryProduct(productId: string): Promise<ApiResponse<GroceryProductVo>> {
  return request<GroceryProductVo>({
    url: `/api/v1/pub/grocery/products/${productId}`,
    method: 'GET',
    authRequired: false,
  });
}

/** 单价(分/斤) × 预估克数 → 总分 */
export function calcEstimatedCents(unitPriceCentsPerJin: string, totalGrams: number): number {
  return Math.round((Number(unitPriceCentsPerJin) * totalGrams) / 500);
}
