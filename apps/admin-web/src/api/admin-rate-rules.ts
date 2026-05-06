import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface RateRuleItemVo {
  rateRuleId: string;
  cityCode: string;
  categoryId: string | null;
  merchantCommissionRate: number;
  riderServiceFee: string;
  withdrawFeeRate: number;
  settlementCycle: string;
  effectiveAt: number;
  status: string;
  createdAt: number;
}

export interface RateRulesListVo {
  items: RateRuleItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface PatchRateRuleDto {
  cityCode: string;
  categoryId?: string | null;
  merchantCommissionRate: number;
  riderServiceFee: string;
  withdrawFeeRate: number;
  settlementCycle: 'T1' | 'WEEKLY' | 'MONTHLY';
  effectiveAt: number;
}

export interface RateRulePatchVo {
  ruleId: string;
  effectiveAt: number;
}

export function listRateRules(params?: {
  cityCode?: string;
  status?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<RateRulesListVo>> {
  return request({ url: '/api/v1/admin/rate-rules', method: 'GET', params });
}

export function patchRateRule(dto: PatchRateRuleDto): Promise<ApiResponse<RateRulePatchVo>> {
  return request({ url: '/api/v1/admin/rate-rules', method: 'PATCH', data: dto });
}
