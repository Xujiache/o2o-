import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminDispatchItemVo {
  dispatchTaskId: string;
  bizType: string;
  bizOrderId: string;
  bizTaskId: string | null;
  acceptedRiderId: string | null;
  status: string;
  retryCount: number;
  dispatchedAt: number;
  timeoutAt: number;
  completedAt: number | null;
}

export interface AdminDispatchListVo {
  items: AdminDispatchItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface AdminDispatchDetailVo extends AdminDispatchItemVo {
  candidateRiderIds: string[];
}

export function listDispatchTasks(params?: {
  status?: string;
  bizType?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminDispatchListVo>> {
  return request({ url: '/api/v1/admin/dispatch-tasks', method: 'GET', params });
}

export function getDispatchDetail(id: string): Promise<ApiResponse<AdminDispatchDetailVo>> {
  return request({ url: `/api/v1/admin/dispatch-tasks/${id}`, method: 'GET' });
}

export interface ManualAssignDto {
  riderId: string;
  reason?: string;
}

export interface ManualAssignVo {
  taskId: string;
  dispatchStatus: string;
  assignedAt: number;
}

export function manualAssign(taskId: string, dto: ManualAssignDto): Promise<ApiResponse<ManualAssignVo>> {
  return request({ url: `/api/v1/admin/dispatch/tasks/${taskId}/assign`, method: 'POST', data: dto });
}
