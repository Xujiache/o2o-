import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface FoodHomeBanner {
  imageUrl: string;
  linkUrl?: string;
  displayOrder: number;
}
export interface FoodHomeCategory {
  categoryId: string;
  name: string;
  iconUrl?: string | null;
}
export interface FoodHomeRecommendedStore {
  storeId: string;
  name: string;
  iconUrl?: string | null;
  distance: number | null;
  sales: number;
  rating: number;
  deliveryFee: string;
  minOrderAmount: string;
  businessStatus: string;
  statusUpdatedAt?: number;
}
export interface FoodHomeVo {
  cityCode: string;
  banners: FoodHomeBanner[];
  categories: FoodHomeCategory[];
  activityEntries: unknown[];
  recommendedStores: FoodHomeRecommendedStore[];
}

export function getFoodHome(cityCode: string, lng?: number, lat?: number): Promise<ApiResponse<FoodHomeVo>> {
  const data: Record<string, unknown> = { cityCode };
  if (lng != null) data.lng = lng;
  if (lat != null) data.lat = lat;
  return request<FoodHomeVo>({ url: '/api/v1/c/food/home', method: 'GET', data });
}
