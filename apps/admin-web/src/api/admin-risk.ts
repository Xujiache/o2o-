import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface RiskExceptionItemVo {
  logId: string;
  exceptionType: string;
  bizType: string;
  bizOrderId: string;
  severity: string;
  description: string | null;
  status: string;
  handlerAdminId: string | null;
  handledAt: number | null;
  createdAt: number;
}

export interface RiskExceptionsListVo {
  items: RiskExceptionItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listRiskExceptions(params?: {
  status?: string;
  exceptionType?: string;
  bizType?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<RiskExceptionsListVo>> {
  return request({ url: '/api/v1/admin/risk/exceptions', method: 'GET', params });
}
