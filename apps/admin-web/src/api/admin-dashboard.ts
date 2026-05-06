import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface DashboardOverviewVo {
  gmv: string;
  orderCount: number;
  activeUsers: number;
  onlineRiders: number;
  exceptionOrders: number;
}

export function getDashboardOverview(params?: {
  cityCode?: string;
  from?: number;
  to?: number;
}): Promise<ApiResponse<DashboardOverviewVo>> {
  return request({ url: '/api/v1/admin/dashboard/overview', method: 'GET', params });
}
