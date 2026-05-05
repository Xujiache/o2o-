import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminWithdrawalListItemVo {
  withdrawalId: string;
  withdrawalNo: string;
  storeId: string;
  merchantId: string;
  amountCents: string;
  status: string;
  submittedAt: number;
  completedAt: number | null;
  failReason: string | null;
}

export interface AdminWithdrawalListVo {
  items: AdminWithdrawalListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listWithdrawals(params?: {
  status?: string;
  storeId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminWithdrawalListVo>> {
  return request({ url: '/api/v1/admin/withdrawals', method: 'GET', params });
}

export function getWithdrawalDetail(id: string): Promise<ApiResponse<AdminWithdrawalListItemVo>> {
  return request({ url: `/api/v1/admin/withdrawals/${id}`, method: 'GET' });
}
