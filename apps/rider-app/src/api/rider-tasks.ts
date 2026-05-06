import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface RiderTaskDetailVo {
  taskId: string;
  dispatchTaskId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  bizTaskId: string | null;
  status: string;
  acceptedAt: number;
  arrivedPickupAt: number | null;
  pickedUpAt: number | null;
  deliveredAt: number | null;
  etaAt: number | null;
}

export interface AcceptTaskVo {
  taskId: string;
  orderId: string;
  bizType: string;
  taskStatus: string;
}

export interface ArrivePickupVo {
  taskId: string;
  status: string;
  arrivedAt: number;
}

export interface PickupVo {
  taskId: string;
  status: string;
  pickedUpAt: number;
}

export interface DeliveredVo {
  taskId: string;
  status: string;
  deliveredAt: number;
}

export interface ExceptionVo {
  exceptionId: string;
  status: string;
  platformHandleRequired: boolean;
}

export function getTaskDetail(taskId: string): Promise<ApiResponse<RiderTaskDetailVo>> {
  return request<RiderTaskDetailVo>({ url: `/api/v1/r/tasks/${taskId}`, method: 'GET' });
}

export function acceptTask(taskId: string, body?: { lng?: number; lat?: number }): Promise<ApiResponse<AcceptTaskVo>> {
  return request<AcceptTaskVo>({ url: `/api/v1/r/tasks/${taskId}/accept`, method: 'POST', data: body ?? {} });
}

export function arrivePickup(taskId: string, body: { lng: number; lat: number }): Promise<ApiResponse<ArrivePickupVo>> {
  return request<ArrivePickupVo>({ url: `/api/v1/r/tasks/${taskId}/arrive-pickup`, method: 'POST', data: body });
}

export function pickupTask(
  taskId: string,
  body: { pickupCode?: string; itemCheckResult?: string; photos?: string[] },
): Promise<ApiResponse<PickupVo>> {
  return request<PickupVo>({ url: `/api/v1/r/tasks/${taskId}/pickup`, method: 'POST', data: body });
}

export function deliveredTask(
  taskId: string,
  body: { deliveryProof?: string; lng: number; lat: number },
): Promise<ApiResponse<DeliveredVo>> {
  return request<DeliveredVo>({ url: `/api/v1/r/tasks/${taskId}/delivered`, method: 'POST', data: body });
}

export function reportException(
  taskId: string,
  body: {
    exceptionType: 'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD';
    description: string;
    photos?: string[];
    lng: number;
    lat: number;
  },
): Promise<ApiResponse<ExceptionVo>> {
  return request<ExceptionVo>({ url: `/api/v1/r/tasks/${taskId}/exception`, method: 'POST', data: body });
}
