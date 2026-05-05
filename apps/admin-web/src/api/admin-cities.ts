import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const CityEndpoints = {
  List: '/api/v1/admin/cities',
  Detail: (code: string): string => `/api/v1/admin/cities/${code}`,
} as const;

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface CityItemVo {
  cityCode: string;
  cityName: string;
  province?: string | null;
  serviceEnabled: boolean;
  serviceArea?: GeoJsonPolygon | null;
  displayOrder: number;
  updatedAt: string;
}

export interface CityListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: CityItemVo[];
}

export interface CreateCityReq {
  cityCode: string;
  cityName: string;
  province?: string;
  serviceEnabled?: boolean;
  serviceArea?: GeoJsonPolygon | null;
  displayOrder?: number;
}

export interface UpdateCityReq {
  cityName?: string;
  province?: string;
  serviceEnabled?: boolean;
  serviceArea?: GeoJsonPolygon | null;
  displayOrder?: number;
}

export interface CityMutationVo {
  cityId: string;
  cityCode: string;
  updatedAt: string;
}

export function listCities(q: {
  keyword?: string;
  serviceEnabled?: boolean;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<CityListPageVo>> {
  return request<CityListPageVo>({ url: CityEndpoints.List, method: 'GET', params: q });
}

export function createCity(body: CreateCityReq): Promise<ApiResponse<CityMutationVo>> {
  return request<CityMutationVo>({ url: CityEndpoints.List, method: 'POST', data: body });
}

export function updateCity(code: string, body: UpdateCityReq): Promise<ApiResponse<CityMutationVo>> {
  return request<CityMutationVo>({ url: CityEndpoints.Detail(code), method: 'PATCH' as never, data: body as never });
}

export function disableCity(code: string): Promise<ApiResponse<CityMutationVo>> {
  return request<CityMutationVo>({ url: CityEndpoints.Detail(code), method: 'DELETE' });
}
