import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ErrandTrackVo {
  orderId: string;
  status: string;
  riderLocation: { lng: number; lat: number } | null;
  route: { totalDistanceMeters: number; etaMs: number } | null;
  trackPoints: { lng: number; lat: number; distanceFromStart: number }[];
  eta: number | null;
}

export function getErrandTrack(orderId: string): Promise<ApiResponse<ErrandTrackVo>> {
  return request<ErrandTrackVo>({
    url: `/api/v1/c/errand/orders/${orderId}/track`,
    method: 'GET',
  });
}
