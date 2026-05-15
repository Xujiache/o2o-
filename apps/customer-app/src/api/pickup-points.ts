/** GR-1 自提点公开 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface PickupPointVo {
  pickupPointId: string;
  name: string;
  address: string;
  cityCode?: string | null;
  lng: string;
  lat: string;
  businessHourStart: string;
  businessHourEnd: string;
  contactPhone?: string | null;
  status: 'active' | 'suspended' | 'offline';
  notice?: string | null;
  /** 距用户距离(米),仅当请求带 lng/lat 时返回 */
  distanceMeters?: number;
}

export interface ListPickupPointsVo {
  list: PickupPointVo[];
}

export interface ListPickupPointsQuery {
  lng?: number;
  lat?: number;
  cityCode?: string;
  limit?: number;
}

export function listPickupPoints(query: ListPickupPointsQuery = {}): Promise<ApiResponse<ListPickupPointsVo>> {
  return request<ListPickupPointsVo>({
    url: '/api/v1/pub/pickup-points',
    method: 'GET',
    params: query as Record<string, unknown>,
    authRequired: false,
  });
}

export function getPickupPoint(pickupPointId: string): Promise<ApiResponse<PickupPointVo>> {
  return request<PickupPointVo>({
    url: `/api/v1/pub/pickup-points/${pickupPointId}`,
    method: 'GET',
    authRequired: false,
  });
}
