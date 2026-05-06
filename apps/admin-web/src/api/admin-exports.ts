import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ExportTaskVo {
  exportTaskId: string;
  exportNo: string;
  exportType: string;
  status: string;
  fileUrl: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateExportDto {
  exportType: string;
  queryParams?: Record<string, unknown>;
}

export function createExport(dto: CreateExportDto): Promise<ApiResponse<ExportTaskVo>> {
  return request({ url: '/api/v1/admin/exports', method: 'POST', data: dto });
}

export function getExport(id: string): Promise<ApiResponse<ExportTaskVo>> {
  return request({ url: `/api/v1/admin/exports/${id}`, method: 'GET' });
}
