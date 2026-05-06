import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface EarningItemVo {
  earningId: string;
  settleDate: number;
  orderCount: number;
  baseAmount: string;
  distanceAmount: string;
  timelyBonus: string;
  rewardAmount: string;
  deductAmount: string;
  totalAmount: string;
  status: string;
}

export interface EarningSummaryVo {
  totalIncome: string;
  orderCount: number;
  rewardAmount: string;
  deductAmount: string;
  items: EarningItemVo[];
  pageNo: number;
  pageSize: number;
}

export function getEarnings(params?: {
  fromDate?: number;
  toDate?: number;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<EarningSummaryVo>> {
  return request<EarningSummaryVo>({ url: `/api/v1/r/earnings`, method: 'GET', params });
}
