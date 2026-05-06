import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface TrackPointVo {
  lng: string;
  lat: string;
  recordedAt: number;
}

export interface TrackReplayVo {
  count: number;
  points: TrackPointVo[];
}

export function getTrackReplay(params: {
  riderTaskId?: string;
  riderId?: string;
  from?: number;
  to?: number;
}): Promise<ApiResponse<TrackReplayVo>> {
  return request({ url: '/api/v1/admin/track-replay', method: 'GET', params });
}
