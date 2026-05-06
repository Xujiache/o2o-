import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface WithdrawalListItemVo {
  withdrawalId: string;
  withdrawalNo: string;
  amountCents: string;
  status: string;
  submittedAt: number;
  completedAt: number | null;
  failReason: string | null;
}

export interface WithdrawalListVo {
  items: WithdrawalListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface CreateWithdrawalVo {
  withdrawalId: string;
  withdrawalNo: string;
  status: string;
  submittedAt: number;
}

export function listWithdrawals(params?: {
  status?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<WithdrawalListVo>> {
  return request<WithdrawalListVo>({ url: `/api/v1/r/withdrawals`, method: 'GET', params });
}

export function createWithdrawal(body: {
  amountCents: number;
  accountId?: string;
  mobile: string;
  smsCode: string;
}): Promise<ApiResponse<CreateWithdrawalVo>> {
  return request<CreateWithdrawalVo>({ url: `/api/v1/r/withdrawals`, method: 'POST', data: body });
}
