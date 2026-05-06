import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminRefundItemVo {
  refundOrderId: string;
  refundNo: string;
  bizType: string;
  bizOrderId: string;
  paymentOrderId: string | null;
  amount: string;
  status: string;
  provider: string;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AdminRefundsListVo {
  items: AdminRefundItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listRefunds(params?: {
  status?: string;
  bizType?: string;
  bizOrderId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminRefundsListVo>> {
  return request({ url: '/api/v1/admin/refunds', method: 'GET', params });
}

export function getRefund(id: string): Promise<ApiResponse<AdminRefundItemVo>> {
  return request({ url: `/api/v1/admin/refunds/${id}`, method: 'GET' });
}
