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
  statusUpdatedAt?: number;
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

export interface PublicStoreDetailVo {
  storeId: string;
  name: string;
  avatarFileId?: string | null;
  avatarUrl?: string | null;
  businessScope: string;
  minOrderAmount: string;
  deliveryFee: string;
  intro?: string | null;
  notice?: string | null;
  businessStatus: string;
  statusUpdatedAt?: number;
  businessHours: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export function getPublicStoreDetail(storeId: string): Promise<ApiResponse<PublicStoreDetailVo>> {
  return request<PublicStoreDetailVo>({ url: `/api/v1/pub/stores/${storeId}`, method: 'GET' });
}
