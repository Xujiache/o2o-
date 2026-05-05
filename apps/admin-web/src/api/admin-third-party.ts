import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const ThirdPartyEndpoints = {
  List: '/api/v1/admin/integrations',
  Detail: (provider: string): string => `/api/v1/admin/integrations/${provider}`,
} as const;

export type ProviderStatus = 'active' | 'disabled' | 'error';

export interface ThirdPartyConfigItemVo {
  provider: string;
  env: string;
  status: ProviderStatus;
  secretMasked: string;
  lastHealthAt?: string | null;
  errorMessage?: string | null;
  updatedAt: string;
}

export interface ThirdPartyConfigListVo {
  list: ThirdPartyConfigItemVo[];
}

export interface UpdateThirdPartyReq {
  secret?: string;
  status?: ProviderStatus;
}

export interface ThirdPartyMutationVo {
  provider: string;
  changedFields: string[];
  updatedAt: string;
}

export function listIntegrations(): Promise<ApiResponse<ThirdPartyConfigListVo>> {
  return request<ThirdPartyConfigListVo>({ url: ThirdPartyEndpoints.List, method: 'GET' });
}

export function getIntegration(provider: string): Promise<ApiResponse<ThirdPartyConfigItemVo>> {
  return request<ThirdPartyConfigItemVo>({ url: ThirdPartyEndpoints.Detail(provider), method: 'GET' });
}

export function patchIntegration(
  provider: string,
  body: UpdateThirdPartyReq,
): Promise<ApiResponse<ThirdPartyMutationVo>> {
  return request<ThirdPartyMutationVo>({
    url: ThirdPartyEndpoints.Detail(provider),
    method: 'PATCH' as never,
    data: body as never,
  });
}
