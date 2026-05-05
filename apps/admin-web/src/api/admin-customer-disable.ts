import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ChangeStatusVo {
  userId: string;
  accountStatus: string;
}

export function disableCustomer(id: string, reason: string): Promise<ApiResponse<ChangeStatusVo>> {
  return request<ChangeStatusVo>({
    url: `/api/v1/admin/customers/${id}/disable`,
    method: 'POST',
    data: { reason },
  });
}

export function enableCustomer(id: string, reason: string): Promise<ApiResponse<ChangeStatusVo>> {
  return request<ChangeStatusVo>({
    url: `/api/v1/admin/customers/${id}/enable`,
    method: 'POST',
    data: { reason },
  });
}

export interface DisableRecordItemVo {
  accountDisableRecordId: string;
  accountType: string;
  accountId: string;
  action: string;
  reason?: string | null;
  operatorAdminId: string;
  operatorUsername: string;
  createdAt: string;
}

export interface DisableRecordPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: DisableRecordItemVo[];
}

export function listDisableRecords(q: {
  accountType?: 'customer' | 'merchant' | 'rider';
  accountId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<DisableRecordPageVo>> {
  return request<DisableRecordPageVo>({
    url: '/api/v1/admin/customers/disable-records',
    method: 'GET',
    params: q,
  });
}
