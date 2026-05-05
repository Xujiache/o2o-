import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface PrepayReq {
  bizType: 'FOOD';
  orderId: string;
  payChannel: 'wxpay' | 'alipay';
}
export interface PrepayVo {
  payOrderId: string;
  payOrderNo: string;
  payParams: string;
  expireAt: number;
}

export function prepay(body: PrepayReq): Promise<ApiResponse<PrepayVo>> {
  return request<PrepayVo>({ url: '/api/v1/c/payments/prepay', method: 'POST', data: body });
}
