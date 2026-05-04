/**
 * 阶段 0 后端接口封装(平台 Web 视角)。
 * 实际调用:audit-logs / integrations-health(本端核心)+ dictionaries(初始化)。
 * cities / files-upload 平台 Web 阶段 0 不调用,保留 endpoint 常量便于跨端核对。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const Endpoints = {
  Dictionaries: '/api/v1/pub/dictionaries',
  Cities: '/api/v1/pub/cities',
  FilesUpload: '/api/v1/pub/files/upload',
  AdminIntegrationsHealth: '/api/v1/admin/integrations/health',
  AdminAuditLogs: '/api/v1/admin/audit-logs',
} as const;

export interface DictItem {
  dictType: string;
  code: string;
  label: string;
  sort: number;
  enabled: boolean;
}

export interface IntegrationHealthVo {
  provider: string;
  status: string;
  lastCheckedAt: number | null;
  errorMessage: string | null;
  mode: string;
}

export interface AuditLogVo {
  id: string;
  traceId: string;
  operatorType: string;
  operatorId: string | null;
  targetType: string;
  targetId: string | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  ip: string | null;
  summary: string | null;
  detailRef: string | null;
  createdAt: number;
}

export interface AuditLogPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: AuditLogVo[];
}

export interface QueryAuditLogQuery {
  operatorType?: string;
  targetType?: string;
  targetId?: string;
  traceId?: string;
  startAt?: number;
  endAt?: number;
  pageNo?: number;
  pageSize?: number;
}

export function getDictionaries(typeList?: string[]): Promise<ApiResponse<DictItem[]>> {
  return request<DictItem[]>({
    url: Endpoints.Dictionaries,
    method: 'GET',
    params: typeList && typeList.length ? { typeList: typeList.join(',') } : undefined,
    toastOnBizError: false,
  });
}

export function getIntegrationsHealth(): Promise<ApiResponse<IntegrationHealthVo[]>> {
  return request<IntegrationHealthVo[]>({
    url: Endpoints.AdminIntegrationsHealth,
    method: 'GET',
  });
}

export function queryAuditLogs(q: QueryAuditLogQuery): Promise<ApiResponse<AuditLogPageVo>> {
  return request<AuditLogPageVo>({
    url: Endpoints.AdminAuditLogs,
    method: 'GET',
    params: q,
  });
}
