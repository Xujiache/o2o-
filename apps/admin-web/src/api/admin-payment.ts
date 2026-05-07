import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminPaymentCallbackLogVo {
  raw: string | null;
  parsedAt: number | null;
}

export interface AdminPaymentVo {
  payOrderId: string;
  payStatus: string;
  paidAt: number | null;
  amountFen: string;
  channel: string;
  thirdPartyTradeNo: string | null;
  callbackLogs: AdminPaymentCallbackLogVo[];
}

export const AdminPaymentEndpoints = {
  Detail: (payOrderId: string): string => `/api/v1/admin/payments/${payOrderId}`,
} as const;

export function getAdminPaymentDetail(payOrderId: string): Promise<ApiResponse<AdminPaymentVo>> {
  return request<AdminPaymentVo>({ url: AdminPaymentEndpoints.Detail(payOrderId), method: 'GET' });
}
