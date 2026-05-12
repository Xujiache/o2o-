/**
 * 平台 Web - 用户管理接口。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const CustomerEndpoints = {
  List: '/api/v1/admin/customers',
  Detail: (id: string): string => `/api/v1/admin/customers/${id}`,
  RealnameRecords: (id: string): string => `/api/v1/admin/customers/${id}/realname-records`,
  ChangeStatus: (id: string): string => `/api/v1/admin/customers/${id}/status`,
} as const;

export type RealnameStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type AccountStatus = 'active' | 'disabled';

export interface CustomerListItemVo {
  userId: string;
  mobileMasked: string;
  nickname: string;
  realnameStatus: RealnameStatus;
  accountStatus: AccountStatus;
  registeredAt: string | null;
  lastLoginAt: string | null;
}

export interface CustomerListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: CustomerListItemVo[];
}

export interface ListCustomersQuery {
  keyword?: string;
  realnameStatus?: RealnameStatus;
  accountStatus?: AccountStatus;
  pageNo?: number;
  pageSize?: number;
}

export interface CustomerDeviceVo {
  deviceId: string;
  platform: string;
  loginAt: string;
  status: string;
}

export interface CustomerRiskTagVo {
  tagType: string;
  reason: string | null;
  createdAt: string;
}

export interface CustomerDetailVo {
  userId: string;
  mobileMasked: string;
  nickname: string;
  realnameStatus: RealnameStatus;
  accountStatus: AccountStatus;
  profileCompleted: boolean;
  recentDevices: CustomerDeviceVo[];
  riskTags: CustomerRiskTagVo[];
}

export interface RealnameRecordItemVo {
  recordId: string;
  realNameMasked: string;
  idCardMasked: string;
  status: 'pending' | 'success' | 'failed';
  failedReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface RealnameRecordPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: RealnameRecordItemVo[];
}

export interface ChangeStatusReq {
  operation: 'enable' | 'disable';
  reason: string;
}

export interface ChangeStatusVo {
  userId: string;
  accountStatus: AccountStatus;
}

export function listCustomers(q: ListCustomersQuery): Promise<ApiResponse<CustomerListPageVo>> {
  return request<CustomerListPageVo>({ url: CustomerEndpoints.List, method: 'GET', params: q });
}

export function getCustomerDetail(id: string): Promise<ApiResponse<CustomerDetailVo>> {
  return request<CustomerDetailVo>({ url: CustomerEndpoints.Detail(id), method: 'GET' });
}

export function listRealnameRecords(id: string, pageNo = 1, pageSize = 20): Promise<ApiResponse<RealnameRecordPageVo>> {
  return request<RealnameRecordPageVo>({
    url: CustomerEndpoints.RealnameRecords(id),
    method: 'GET',
    params: { pageNo, pageSize },
  });
}

export function changeCustomerStatus(id: string, body: ChangeStatusReq): Promise<ApiResponse<ChangeStatusVo>> {
  return request<ChangeStatusVo>({ url: CustomerEndpoints.ChangeStatus(id), method: 'POST', data: body });
}
