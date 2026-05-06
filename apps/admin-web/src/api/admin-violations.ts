import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminViolationItemVo {
  violationId: string;
  riderId: string;
  riderTaskId: string | null;
  type: string;
  description: string;
  deductCents: string | null;
  status: string;
  reportedAt: number;
  decidedAt: number | null;
  decision: string | null;
}

export interface AdminViolationsListVo {
  items: AdminViolationItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listViolations(params?: {
  status?: string;
  type?: string;
  riderId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminViolationsListVo>> {
  return request({ url: '/api/v1/admin/violations', method: 'GET', params });
}
