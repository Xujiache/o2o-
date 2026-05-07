import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminMerchantStatisticsItemVo {
  snapshotId: string;
  storeId: string;
  merchantId: string;
  snapshotDate: number;
  orderCount: number;
  grossCents: string;
  refundCents: string;
  netCents: string;
  storeRating: string;
}

export interface AdminMerchantStatisticsListVo {
  items: AdminMerchantStatisticsItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface AdminMerchantStatisticsQuery {
  storeId?: string;
  snapshotDate?: number;
  pageNo?: number;
  pageSize?: number;
}

export function listMerchantStatistics(
  params?: AdminMerchantStatisticsQuery,
): Promise<ApiResponse<AdminMerchantStatisticsListVo>> {
  return request<AdminMerchantStatisticsListVo>({
    url: '/api/v1/admin/merchant-statistics',
    method: 'GET',
    params,
  });
}
