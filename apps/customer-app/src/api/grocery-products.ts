import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type PricingMode = 'fixed' | 'weighed';
export type WeightUnit = 'jin' | 'kg' | 'g';
export type GroceryProductSort = 'sales' | 'price_asc' | 'price_desc' | 'new';

export interface GroceryProductItem {
  productId: string;
  storeId: string;
  categoryId: string;
  name: string;
  coverImageFileId: string | null;
  pricingMode: PricingMode;
  weightUnit: WeightUnit | null;
  /** fixed: 售价(分/份);weighed: 0,看 unitPricePerJin */
  price: string;
  /** weighed 每斤价(分) */
  unitPricePerJin: string | null;
  minWeightG: number | null;
  maxWeightG: number | null;
  stock: number;
  sales: number;
}

export interface GroceryProductDetail extends GroceryProductItem {
  description: string | null;
  images: string[] | null;
}

export interface GroceryProductPage {
  items: GroceryProductItem[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface ListGroceryProductsQuery {
  categoryId?: string;
  keyword?: string;
  sort?: GroceryProductSort;
  pageNo?: number;
  pageSize?: number;
}

export function listGroceryProducts(q: ListGroceryProductsQuery = {}): Promise<ApiResponse<GroceryProductPage>> {
  return request<GroceryProductPage>({
    url: '/api/v1/c/grocery/products',
    method: 'GET',
    params: q as Record<string, unknown>,
    authRequired: false,
  });
}

export function getGroceryProduct(productId: string): Promise<ApiResponse<GroceryProductDetail>> {
  return request<GroceryProductDetail>({
    url: `/api/v1/c/grocery/products/${productId}`,
    method: 'GET',
    authRequired: false,
  });
}
