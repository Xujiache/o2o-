import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ApplyAfterSaleReq {
  orderId: string;
  type: 'REFUND' | 'EXCHANGE';
  reason: string;
  amountCents: number;
  evidenceFileIds?: string[];
}

export interface ApplyAfterSaleVo {
  afterSaleId: string;
  status: string;
  appliedAt: number;
}

export function applyAfterSale(body: ApplyAfterSaleReq): Promise<ApiResponse<ApplyAfterSaleVo>> {
  return request({
    url: `/api/v1/c/after-sales`,
    method: 'POST',
    data: body,
  });
}
