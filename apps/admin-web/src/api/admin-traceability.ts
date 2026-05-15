/** GR-5 admin 端溯源 API */
import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type ArchiveStatus = 'draft' | 'active' | 'sold';
export type QrcodeStatus = 'blank' | 'bound' | 'sold' | 'voided';

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
  status: ArchiveStatus;
  remark?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListArchivesVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: ArchiveVo[];
}
export interface ArchiveMutationVo {
  archiveId: string;
  updatedAt: string;
}

export interface CreateArchiveReq {
  productId?: string;
  batchNo: string;
  farmName?: string;
  farmAddress?: string;
  breedDate?: number;
  slaughterDate?: number;
  weightGrams?: number;
  quarantineCertNo?: string;
  veterinarian?: string;
  feedType?: string;
  vaccineRecords?: VaccineRecord[];
  status?: ArchiveStatus;
  remark?: string;
}

export type UpdateArchiveReq = Partial<CreateArchiveReq>;

export interface BatchVo {
  batchId: string;
  name: string;
  totalCount: number;
  generatedBy?: string | null;
  createdAt: string;
}

export interface ListBatchesVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: BatchVo[];
}

export interface QrcodeVo {
  qrcodeId: string;
  code: string;
  archiveId?: string | null;
  status: QrcodeStatus;
  generatedBatchId: string;
  generatedAt: string;
  boundAt?: string | null;
  soldAt?: string | null;
  soldOrderId?: string | null;
}

export interface BatchGenerationResultVo {
  batchId: string;
  name: string;
  totalCount: number;
  codes: string[];
}
export interface ListBatchCodesVo {
  batchId: string;
  name: string;
  codes: QrcodeVo[];
}
export interface BindResultVo {
  qrcodeId: string;
  code: string;
  archiveId: string;
  status: QrcodeStatus;
}

const E = '/api/v1/admin/traceability';

export function listArchives(q: {
  keyword?: string;
  productId?: string;
  status?: ArchiveStatus;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<ListArchivesVo>> {
  return request<ListArchivesVo>({ url: `${E}/archives`, method: 'GET', params: q });
}

export function createArchive(body: CreateArchiveReq): Promise<ApiResponse<ArchiveMutationVo>> {
  return request<ArchiveMutationVo>({ url: `${E}/archives`, method: 'POST', data: body });
}

export function updateArchive(archiveId: string, body: UpdateArchiveReq): Promise<ApiResponse<ArchiveMutationVo>> {
  return request<ArchiveMutationVo>({
    url: `${E}/archives/${archiveId}`,
    method: 'PATCH' as never,
    data: body as never,
  });
}

export function generateBatch(name: string, count: number): Promise<ApiResponse<BatchGenerationResultVo>> {
  return request<BatchGenerationResultVo>({
    url: `${E}/qrcodes/batches`,
    method: 'POST',
    data: { name, count },
  });
}

export function listBatches(q: { pageNo?: number; pageSize?: number }): Promise<ApiResponse<ListBatchesVo>> {
  return request<ListBatchesVo>({ url: `${E}/qrcodes/batches`, method: 'GET', params: q });
}

export function listBatchCodes(batchId: string): Promise<ApiResponse<ListBatchCodesVo>> {
  return request<ListBatchCodesVo>({ url: `${E}/qrcodes/batches/${batchId}/codes`, method: 'GET' });
}

export function bindQrcodeToArchive(code: string, archiveId: string): Promise<ApiResponse<BindResultVo>> {
  return request<BindResultVo>({
    url: `${E}/qrcodes/${encodeURIComponent(code)}/bind`,
    method: 'POST',
    data: { archiveId },
  });
}
