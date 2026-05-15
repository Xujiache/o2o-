/** GR-1 admin 端自提点管理 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type PickupPointStatus = 'active' | 'suspended' | 'offline';

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
  status: PickupPointStatus;
  notice?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PickupPointListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: PickupPointVo[];
}

export interface PickupPointMutationVo {
  pickupPointId: string;
  updatedAt: string;
}

export interface CreatePickupPointReq {
  name: string;
  address: string;
  cityCode?: string;
  lng: number;
  lat: number;
  businessHourStart?: string;
  businessHourEnd?: string;
  contactPhone?: string;
  status?: PickupPointStatus;
  notice?: string;
}

export type UpdatePickupPointReq = Partial<CreatePickupPointReq>;

const ENDPOINT = '/api/v1/admin/pickup-points';

export function listPickupPoints(q: {
  keyword?: string;
  status?: PickupPointStatus;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<PickupPointListPageVo>> {
  return request<PickupPointListPageVo>({ url: ENDPOINT, method: 'GET', params: q });
}

export function createPickupPoint(body: CreatePickupPointReq): Promise<ApiResponse<PickupPointMutationVo>> {
  return request<PickupPointMutationVo>({ url: ENDPOINT, method: 'POST', data: body });
}

export function updatePickupPoint(
  pickupPointId: string,
  body: UpdatePickupPointReq,
): Promise<ApiResponse<PickupPointMutationVo>> {
  return request<PickupPointMutationVo>({
    url: `${ENDPOINT}/${pickupPointId}`,
    method: 'PATCH' as never,
    data: body as never,
  });
}

export function softDeletePickupPoint(pickupPointId: string): Promise<ApiResponse<PickupPointMutationVo>> {
  return request<PickupPointMutationVo>({ url: `${ENDPOINT}/${pickupPointId}`, method: 'DELETE' });
}
