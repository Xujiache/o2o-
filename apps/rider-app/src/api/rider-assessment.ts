import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AssessmentBadgeVo {
  code: string;
  label: string;
  awardedAt: number;
}

export interface AssessmentVo {
  period: number;
  onTimeRate: string;
  acceptRate: string;
  complaintRate: string;
  avgRating: string;
  rankInCity: number | null;
  badges: AssessmentBadgeVo[];
}

export function getAssessment(period?: number): Promise<ApiResponse<AssessmentVo>> {
  return request<AssessmentVo>({
    url: `/api/v1/r/assessment`,
    method: 'GET',
    params: period ? { period } : undefined,
  });
}
