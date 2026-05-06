import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ViolationItemVo {
  violationId: string;
  riderTaskId: string | null;
  type: string;
  description: string;
  deductCents: string | null;
  status: string;
  reportedAt: number;
  decidedAt: number | null;
  decision: string | null;
}

export interface ViolationListVo {
  items: ViolationItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listViolations(params?: {
  status?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<ViolationListVo>> {
  return request<ViolationListVo>({ url: `/api/v1/r/violations`, method: 'GET', params });
}
