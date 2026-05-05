import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminSettlementListItemVo {
  settlementId: string;
  settlementNo: string;
  storeId: string;
  merchantId: string;
  periodStart: number;
  periodEnd: number;
  grossCents: string;
  commissionCents: string;
  feeCents: string;
  netCents: string;
  orderCount: number;
  refundCount: number;
  status: string;
  completedAt: number | null;
  createdAt: number;
}

export interface AdminSettlementListVo {
  items: AdminSettlementListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listSettlements(params?: {
  status?: string;
  storeId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminSettlementListVo>> {
  return request({ url: '/api/v1/admin/settlements', method: 'GET', params });
}

export function getSettlementDetail(id: string): Promise<ApiResponse<AdminSettlementListItemVo>> {
  return request({ url: `/api/v1/admin/settlements/${id}`, method: 'GET' });
}
