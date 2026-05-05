import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface SettlementListItemVo {
  settlementId: string;
  settlementNo: string;
  periodStart: number;
  periodEnd: number;
  grossCents: string;
  commissionCents: string;
  feeCents: string;
  netCents: string;
  orderCount: number;
  status: string;
  createdAt: number;
}

export interface SettlementListVo {
  items: SettlementListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listSettlements(params?: {
  month?: string;
  status?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<SettlementListVo>> {
  return request({ url: '/api/v1/m/settlements', method: 'GET', params });
}
