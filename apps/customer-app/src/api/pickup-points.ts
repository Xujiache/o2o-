import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface PickupPoint {
  pickupPointId: string;
  merchantId: string;
  storeId: string | null;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  address: string;
  lng: number;
  lat: number;
  status: number;
  distanceM?: number;
}

export interface PickupSlot {
  slotId: string;
  pickupPointId: string;
  slotDate: string;
  startMinute: number;
  endMinute: number;
  capacity: number;
  reserved: number;
  remain: number;
}

export interface ListPickupPointsQuery {
  lng?: number;
  lat?: number;
  keyword?: string;
}

export function listPickupPoints(q: ListPickupPointsQuery = {}): Promise<ApiResponse<PickupPoint[]>> {
  return request<PickupPoint[]>({
    url: '/api/v1/c/pickup-points',
    method: 'GET',
    params: q as Record<string, unknown>,
    authRequired: false,
  });
}

export function getPickupPoint(id: string): Promise<ApiResponse<PickupPoint>> {
  return request<PickupPoint>({
    url: `/api/v1/c/pickup-points/${id}`,
    method: 'GET',
    authRequired: false,
  });
}

export function listPickupSlots(id: string, date: string): Promise<ApiResponse<PickupSlot[]>> {
  return request<PickupSlot[]>({
    url: `/api/v1/c/pickup-points/${id}/slots`,
    method: 'GET',
    params: { date },
    authRequired: false,
  });
}
