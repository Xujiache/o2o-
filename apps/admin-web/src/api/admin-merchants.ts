/**
 * 平台 Web - 商家管理接口(stage 2)。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const MerchantEndpoints = {
  Applications: '/api/v1/admin/merchants/applications',
  ApplicationDetail: (id: string): string => `/api/v1/admin/merchants/applications/${id}`,
  Audit: (id: string): string => `/api/v1/admin/merchants/${id}/audit`,
  Stores: '/api/v1/admin/merchants/stores',
  StoreBusinessStatus: (id: string): string => `/api/v1/admin/merchants/stores/${id}/business-status`,
} as const;

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
export type BusinessStatus = 'online' | 'offline' | 'paused';

export interface ApplicationListItemVo {
  applicationId: string;
  merchantId: string;
  storeName: string;
  legalPersonMasked: string;
  licenseNoMasked: string;
  auditStatus: AuditStatus;
  submittedAt: string;
}

export interface ApplicationListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: ApplicationListItemVo[];
}

export interface ListApplicationsQuery {
  auditStatus?: AuditStatus;
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface LicenseFileVo {
  licenseType: string;
  fileId: string;
  url?: string | null;
}

export interface ApplicationDetailVo {
  applicationId: string;
  merchantId: string;
  mobileMasked: string;
  storeName: string;
  businessScope: string;
  legalPersonMasked: string;
  idCardMasked: string;
  licenseNoMasked: string;
  foodPermitNoMasked?: string;
  auditStatus: AuditStatus;
  rejectReason?: string | null;
  commissionRate?: string | null;
  licenses: LicenseFileVo[];
  submittedAt: string;
}

export interface AuditReq {
  auditResult: 'approved' | 'rejected';
  rejectReason?: string;
  commissionRate?: number;
}

export interface AuditVo {
  merchantId: string;
  storeId?: string | null;
  auditStatus: AuditStatus;
}

export interface StoreItemVo {
  storeId: string;
  merchantId: string;
  name: string;
  businessStatus: BusinessStatus;
  commissionRate: string | null;
}

export interface StoresPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: StoreItemVo[];
}

export function listApplications(q: ListApplicationsQuery): Promise<ApiResponse<ApplicationListPageVo>> {
  return request<ApplicationListPageVo>({ url: MerchantEndpoints.Applications, method: 'GET', params: q });
}

export function getApplicationDetail(id: string): Promise<ApiResponse<ApplicationDetailVo>> {
  return request<ApplicationDetailVo>({ url: MerchantEndpoints.ApplicationDetail(id), method: 'GET' });
}

export function auditApplication(applicationId: string, body: AuditReq): Promise<ApiResponse<AuditVo>> {
  return request<AuditVo>({ url: MerchantEndpoints.Audit(applicationId), method: 'POST', data: body });
}

export function listStores(q: {
  businessStatus?: BusinessStatus;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<StoresPageVo>> {
  return request<StoresPageVo>({ url: MerchantEndpoints.Stores, method: 'GET', params: q });
}

export function setStoreBusinessStatus(
  storeId: string,
  body: { businessStatus: BusinessStatus; reason?: string },
): Promise<ApiResponse<unknown>> {
  return request({
    url: MerchantEndpoints.StoreBusinessStatus(storeId),
    method: 'PATCH' as const,
    data: body as never,
  });
}
