/**
 * 平台 Web - 骑手管理接口。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const RiderEndpoints = {
  Riders: '/api/v1/admin/riders',
  Detail: (id: string): string => `/api/v1/admin/riders/${id}`,
  Audit: (id: string): string => `/api/v1/admin/riders/${id}/audit`,
  Status: (id: string): string => `/api/v1/admin/riders/${id}/status`,
  ServiceArea: (id: string): string => `/api/v1/admin/riders/${id}/service-area`,
} as const;

export type AuditStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
export type AccountStatus = 'active' | 'disabled';

export interface RiderListItemVo {
  applicationId: string;
  riderId?: string | null;
  mobile: string;
  realName: string;
  idCardNo: string;
  auditStatus: AuditStatus;
  submittedAt: string;
}

export interface RiderListPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: RiderListItemVo[];
}

export interface ListRidersQuery {
  keyword?: string;
  auditStatus?: AuditStatus;
  accountStatus?: AccountStatus;
  pageNo?: number;
  pageSize?: number;
}

export interface RiderCertificateFileVo {
  certType: string;
  fileId: string;
  url?: string | null;
}

export interface RiderDetailVo {
  applicationId: string;
  riderId?: string | null;
  mobile: string;
  realName: string;
  idCardNo: string;
  healthCertNo: string;
  healthCertExpiry: string;
  auditStatus: AuditStatus;
  rejectReason?: string | null;
  accountStatus?: AccountStatus;
  onlineStatus?: 'online' | 'offline' | 'busy';
  vehicleType?: string;
  plateNo?: string | null;
  certificates: RiderCertificateFileVo[];
  submittedAt: string;
}

export interface AuditReq {
  auditResult: 'approved' | 'rejected';
  rejectReason?: string;
}

export interface AuditVo {
  riderId?: string | null;
  applicationId: string;
  auditStatus: AuditStatus;
}

export interface UpdateStatusReq {
  targetStatus: 'enabled' | 'disabled';
  reason?: string;
}

export interface GeoJsonPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface UpdateServiceAreaReq {
  geometry: GeoJsonPolygon;
  maxConcurrentOrders?: number;
}

export function listRiders(q: ListRidersQuery): Promise<ApiResponse<RiderListPageVo>> {
  return request<RiderListPageVo>({ url: RiderEndpoints.Riders, method: 'GET', params: q });
}

export function getRiderDetail(applicationId: string): Promise<ApiResponse<RiderDetailVo>> {
  return request<RiderDetailVo>({ url: RiderEndpoints.Detail(applicationId), method: 'GET' });
}

export function auditRider(applicationId: string, body: AuditReq): Promise<ApiResponse<AuditVo>> {
  return request<AuditVo>({ url: RiderEndpoints.Audit(applicationId), method: 'POST', data: body });
}

export function updateRiderStatus(
  riderId: string,
  body: UpdateStatusReq,
): Promise<ApiResponse<{ riderId: string; accountStatus: string }>> {
  return request({ url: RiderEndpoints.Status(riderId), method: 'POST', data: body as never });
}

export function updateRiderServiceArea(
  riderId: string,
  body: UpdateServiceAreaReq,
): Promise<ApiResponse<{ riderId: string; updated: boolean }>> {
  return request({
    url: RiderEndpoints.ServiceArea(riderId),
    method: 'PATCH' as const,
    data: body as never,
  });
}
