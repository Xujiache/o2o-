/**
 * 阶段 0 接口封装。
 * 骑手端实际调用:dictionaries / cities(配送区域) / files-upload(凭证)。
 * audit-logs / integrations-health 阶段 0 骑手端不调用,保留 endpoint 常量便于跨端核对。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request, upload } from '@/utils/request';

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

export interface CityItem {
  cityCode: string;
  cityName: string;
  province: string;
  serviceEnabled: boolean;
}

export interface UploadResultVo {
  fileId: string;
  url: string;
  expireAt: number;
  size: number;
}

export function getDictionaries(typeList?: string[]): Promise<ApiResponse<DictItem[]>> {
  return request<DictItem[]>({
    url: Endpoints.Dictionaries,
    method: 'GET',
    params: typeList && typeList.length ? { typeList: typeList.join(',') } : undefined,
    authRequired: false,
  });
}

export function getCities(keyword?: string, enabled?: boolean): Promise<ApiResponse<CityItem[]>> {
  const params: Record<string, unknown> = {};
  if (keyword) params.keyword = keyword;
  if (enabled !== undefined) params.enabled = enabled;
  return request<CityItem[]>({
    url: Endpoints.Cities,
    method: 'GET',
    params,
    authRequired: false,
  });
}

export function uploadFile(filePath: string, bizType: string): Promise<ApiResponse<UploadResultVo>> {
  return upload<UploadResultVo>({ filePath, bizType });
}
