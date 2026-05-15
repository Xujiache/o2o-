/** GR-2 admin 端生鲜商品 + 分类 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type CategoryStatus = 'active' | 'inactive';
export type ProductSaleStatus = 'on_shelf' | 'off_shelf' | 'sold_out';
export type GroceryPricedBy = 'weight' | 'piece' | 'sku';
export type GroceryPriceDisplayRule = 'starting' | 'range' | 'uniform';
export type GroceryDeliveryMethod = 'self_pickup' | 'city_delivery' | 'express' | 'pickup_point';

export const GROCERY_DELIVERY_METHOD_LABELS: Record<GroceryDeliveryMethod, string> = {
  self_pickup: '到店自提',
  city_delivery: '同城配送',
  express: '快递发货',
  pickup_point: '自提点',
};

export const GROCERY_PRICED_BY_LABELS: Record<GroceryPricedBy, string> = {
  weight: '按斤计价',
  piece: '按件计价',
  sku: '按规格计价',
};

export const GROCERY_PRICE_DISPLAY_RULE_LABELS: Record<GroceryPriceDisplayRule, string> = {
  starting: '起售价(¥X 起)',
  range: '区间价(¥X~¥Y)',
  uniform: '统一价(¥X)',
};

export const GROCERY_LIMITS = {
  mainImages: 10,
  detailImages: 20,
  tags: 8,
  tagLen: 16,
  skus: 30,
} as const;

export interface GroceryCategoryVo {
  categoryId: string;
  name: string;
  iconFileId?: string | null;
  displayOrder: number;
  status: CategoryStatus;
}

export interface ListGroceryCategoriesVo {
  list: GroceryCategoryVo[];
}

export interface CategoryMutationVo {
  categoryId: string;
  updatedAt: string;
}

export interface CreateGroceryCategoryReq {
  name: string;
  iconFileId?: string;
  displayOrder?: number;
  status?: CategoryStatus;
}

export type UpdateGroceryCategoryReq = Partial<CreateGroceryCategoryReq>;

export interface GrocerySkuVo {
  skuId: string;
  specValue: string;
  priceCents: string;
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
  unitPriceCentsPerJin: string;
  estimatedWeightGrams: number;
  stockJin: string;
  deliveryMethods?: GroceryDeliveryMethod[] | null;
  priceDisplayRule: GroceryPriceDisplayRule;
  priceFromCents?: string | null;
  priceToCents?: string | null;
  skus: GrocerySkuVo[];
  saleStatus: ProductSaleStatus;
  hasTraceability: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListGroceryProductsVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: GroceryProductVo[];
  categoryNames?: Record<string, string>;
}

export interface ProductMutationVo {
  productId: string;
  updatedAt: string;
}

export interface GrocerySkuItem {
  skuId?: string;
  specValue: string;
  priceCents: number;
  stockJin: number;
  weightGrams?: number;
  displayOrder?: number;
}

export interface CreateGroceryProductReq {
  categoryId: string;
  name: string;
  coverImageFileId?: string;
  mainImageFileIds?: string[];
  detailImageFileIds?: string[];
  description?: string;
  tags?: string[];
  isWeighted?: boolean;
  pricedBy?: GroceryPricedBy;
  unitPriceCentsPerJin: number;
  estimatedWeightGrams?: number;
  initialStockJin?: number;
  deliveryMethods?: GroceryDeliveryMethod[];
  priceDisplayRule?: GroceryPriceDisplayRule;
  skus?: GrocerySkuItem[];
  saleStatus?: ProductSaleStatus;
  hasTraceability?: boolean;
}

export type UpdateGroceryProductReq = Partial<Omit<CreateGroceryProductReq, 'categoryId'>> & {
  categoryId?: string;
};

const E = '/api/v1/admin/grocery';

export function listAdminGroceryCategories(): Promise<ApiResponse<ListGroceryCategoriesVo>> {
  return request<ListGroceryCategoriesVo>({ url: `${E}/categories`, method: 'GET' });
}

export function createGroceryCategory(body: CreateGroceryCategoryReq): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({ url: `${E}/categories`, method: 'POST', data: body });
}

export function updateGroceryCategory(
  categoryId: string,
  body: UpdateGroceryCategoryReq,
): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({
    url: `${E}/categories/${categoryId}`,
    method: 'PATCH' as never,
    data: body as never,
  });
}

export function deleteGroceryCategory(categoryId: string): Promise<ApiResponse<CategoryMutationVo>> {
  return request<CategoryMutationVo>({ url: `${E}/categories/${categoryId}`, method: 'DELETE' });
}

export function listAdminGroceryProducts(q: {
  keyword?: string;
  categoryId?: string;
  saleStatus?: ProductSaleStatus;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<ListGroceryProductsVo>> {
  return request<ListGroceryProductsVo>({ url: `${E}/products`, method: 'GET', params: q });
}

export function createGroceryProduct(body: CreateGroceryProductReq): Promise<ApiResponse<ProductMutationVo>> {
  return request<ProductMutationVo>({ url: `${E}/products`, method: 'POST', data: body });
}

export function updateGroceryProduct(
  productId: string,
  body: UpdateGroceryProductReq,
): Promise<ApiResponse<ProductMutationVo>> {
  return request<ProductMutationVo>({
    url: `${E}/products/${productId}`,
    method: 'PATCH' as never,
    data: body as never,
  });
}

export function shelfGroceryProduct(
  productId: string,
  action: 'on_shelf' | 'off_shelf',
): Promise<ApiResponse<ProductMutationVo>> {
  return request<ProductMutationVo>({
    url: `${E}/products/${productId}/shelf`,
    method: 'POST',
    data: { action },
  });
}

export function adjustGroceryProductStock(
  productId: string,
  deltaJin: number,
  reason?: string,
): Promise<ApiResponse<ProductMutationVo>> {
  return request<ProductMutationVo>({
    url: `${E}/products/${productId}/stock`,
    method: 'PATCH' as never,
    data: { deltaJin, reason } as never,
  });
}
