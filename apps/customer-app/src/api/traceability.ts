/** GR-5 customer 端公开溯源 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface VaccineRecord {
  name: string;
  date: string;
}

export interface ArchiveVo {
  archiveId: string;
  productId?: string | null;
  batchNo: string;
  farmName?: string | null;
  farmAddress?: string | null;
  breedDate?: string | null;
  slaughterDate?: string | null;
  weightGrams?: number | null;
  quarantineCertNo?: string | null;
  veterinarian?: string | null;
  feedType?: string | null;
  vaccineRecords?: VaccineRecord[] | null;
  status: string;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTraceVo {
  code: string;
  status: 'blank' | 'bound' | 'sold' | 'voided';
  archive?: ArchiveVo | null;
}

export function publicLookupTrace(code: string): Promise<ApiResponse<PublicTraceVo>> {
  return request<PublicTraceVo>({
    url: `/api/v1/pub/trace/${encodeURIComponent(code)}`,
    method: 'GET',
    authRequired: false,
  });
}
