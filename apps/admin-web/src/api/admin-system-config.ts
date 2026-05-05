import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const SystemConfigEndpoints = {
  List: '/api/v1/admin/system-config',
  Detail: (key: string): string => `/api/v1/admin/system-config/${key}`,
} as const;

export interface SystemConfigItemVo {
  configKey: string;
  configValue: string;
  scope: string;
  description?: string | null;
  updatedAt: string;
}

export interface SystemConfigListVo {
  list: SystemConfigItemVo[];
}

export interface SystemConfigMutationVo {
  configKey: string;
  configValue: string;
  updatedAt: string;
}

export function listSystemConfig(): Promise<ApiResponse<SystemConfigListVo>> {
  return request<SystemConfigListVo>({ url: SystemConfigEndpoints.List, method: 'GET' });
}

export function patchSystemConfig(key: string, value: string): Promise<ApiResponse<SystemConfigMutationVo>> {
  return request<SystemConfigMutationVo>({
    url: SystemConfigEndpoints.Detail(key),
    method: 'PATCH' as never,
    data: { value } as never,
  });
}
