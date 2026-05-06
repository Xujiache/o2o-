import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface LocationBatchPoint {
  lng: number;
  lat: number;
  accuracy?: number;
  reportedAt: number;
}

export function uploadLocationBatch(
  batchId: string,
  points: LocationBatchPoint[],
): Promise<ApiResponse<{ accepted: number }>> {
  return request<{ accepted: number }>({
    url: `/api/v1/r/location/batch`,
    method: 'POST',
    data: { batchId, points },
  });
}
