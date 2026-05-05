import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface TopItemVo {
  productId: string;
  productName: string;
  qty: number;
  grossCents: string;
}

export interface StatisticsVo {
  range: string;
  orderCount: number;
  grossCents: string;
  refundCents: string;
  netCents: string;
  storeRating: string;
  topItems: TopItemVo[];
}

export function getStatistics(
  range: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' = 'TODAY',
): Promise<ApiResponse<StatisticsVo>> {
  return request({ url: '/api/v1/m/statistics', method: 'GET', params: { range } });
}
