import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface FoodStoreItem {
  storeId: string;
  name: string;
  iconUrl?: string | null;
  intro?: string | null;
  distance: number | null;
  sales: number;
  rating: number;
  deliveryFee: string;
  minOrderAmount: string;
  businessStatus: string;
}
export interface FoodStoreListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: FoodStoreItem[];
}

export interface ListStoresQuery {
  cityCode: string;
  keyword?: string;
  categoryId?: string;
  sort?: 'distance' | 'sales' | 'rating' | 'recent';
  lng?: number;
  lat?: number;
  pageNo?: number;
  pageSize?: number;
}

export function listFoodStores(q: ListStoresQuery): Promise<ApiResponse<FoodStoreListPageVo>> {
  return request<FoodStoreListPageVo>({ url: '/api/v1/c/food/stores', method: 'GET', data: q });
}
