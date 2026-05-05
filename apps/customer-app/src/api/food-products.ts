import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface FoodSku {
  skuId: string;
  specValue: string;
  price: string;
  availableStock: number;
}
export interface FoodProduct {
  productId: string;
  name: string;
  description?: string | null;
  coverImageFileId?: string | null;
  basePrice: string;
  originalPrice?: string | null;
  saleStatus: 'on_shelf' | 'off_shelf' | 'sold_out' | 'draft';
  categoryId: string;
  skus: FoodSku[];
}
export interface FoodProductCategory {
  categoryId: string;
  name: string;
  displayOrder: number;
}
export interface FoodPromo {
  promoId: string;
  promoType: 'time_limited' | 'single_full_off';
  name: string;
  productIds: string[];
  rules: unknown;
}
export interface FoodStoreProductsVo {
  storeId: string;
  categories: FoodProductCategory[];
  products: FoodProduct[];
  promotions: FoodPromo[];
}

export function getStoreProducts(storeId: string): Promise<ApiResponse<FoodStoreProductsVo>> {
  return request<FoodStoreProductsVo>({
    url: `/api/v1/c/food/stores/${storeId}/products`,
    method: 'GET',
  });
}
