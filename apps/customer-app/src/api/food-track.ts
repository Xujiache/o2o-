import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface TrackVo {
  orderId: string;
  status: string;
  eta: number;
  riderLocation?: { lng: number; lat: number; updatedAt: number } | null;
  start: { lng: number; lat: number };
  end: { lng: number; lat: number };
  source: 'mock' | 'real';
}

export function getOrderTrack(orderId: string): Promise<ApiResponse<TrackVo>> {
  return request<TrackVo>({ url: `/api/v1/c/food/orders/${orderId}/track`, method: 'GET' });
}
