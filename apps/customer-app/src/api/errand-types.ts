import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ErrandTypeVo {
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  name: string;
  requiredFields: string[];
  description: string;
  enabled: number;
  sort: number;
}

export interface ErrandTypeListVo {
  list: ErrandTypeVo[];
}

export function listErrandTypes(cityCode?: string): Promise<ApiResponse<ErrandTypeListVo>> {
  return request<ErrandTypeListVo>({
    url: '/api/v1/c/errand/service-types',
    method: 'GET',
    params: cityCode ? { cityCode } : undefined,
  });
}
