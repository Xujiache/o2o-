import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface MerchantAfterSaleListItemVo {
  afterSaleId: string;
  orderId: string;
  reason: string;
  amountCents: string;
  status: string;
  appliedAt: number;
  createdAt: number;
}

export interface MerchantAfterSaleListVo {
  items: MerchantAfterSaleListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export function listAfterSales(params?: {
  status?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<MerchantAfterSaleListVo>> {
  return request({ url: '/api/v1/m/after-sales', method: 'GET', params });
}

export interface ReviewAfterSaleVo {
  afterSaleId: string;
  status: string;
  nextHandler: string;
}

export function reviewAfterSale(
  afterSaleId: string,
  body: {
    reviewResult: 'APPROVE' | 'REJECT';
    rejectReason?: string;
    evidenceFileIds?: string[];
  },
): Promise<ApiResponse<ReviewAfterSaleVo>> {
  return request({
    url: `/api/v1/m/after-sales/${afterSaleId}/review`,
    method: 'POST',
    data: body,
  });
}
