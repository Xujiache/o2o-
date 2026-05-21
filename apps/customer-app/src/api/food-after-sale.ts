import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ApplyAfterSaleReq {
  orderId: string;
  type: 'REFUND' | 'EXCHANGE';
  reason: string;
  amountCents: number;
  evidenceFileIds?: string[];
}

export interface ApplyAfterSaleVo {
  afterSaleId: string;
  status: string;
  appliedAt: number;
}

export function applyAfterSale(body: ApplyAfterSaleReq): Promise<ApiResponse<ApplyAfterSaleVo>> {
  return request({
    url: `/api/v1/c/after-sales`,
    method: 'POST',
    data: body,
  });
}

/** 售后列表项 — 后端 GET /c/after-sales 尚未提供时本端做容错 */
export interface AfterSaleListItemVo {
  afterSaleId: string;
  orderId: string;
  orderNo?: string | null;
  bizType: 'FOOD' | 'GROCERY' | string;
  type: 'REFUND' | 'EXCHANGE' | string;
  status: string;
  amountCents: number;
  reason: string;
  appliedAt: number;
  updatedAt?: number;
}

export interface ListAfterSalesQuery {
  bizType?: 'FOOD' | 'GROCERY';
  status?: string;
  pageNo?: number;
  pageSize?: number;
}

export interface ListAfterSalesVo {
  list: AfterSaleListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

/**
 * 用户售后列表(全部 bizType)。
 * 后端 stage 11 后填充 GET /c/after-sales,目前前端 try-catch 容错,空态正常。
 */
export function listAfterSales(query: ListAfterSalesQuery = {}): Promise<ApiResponse<ListAfterSalesVo>> {
  return request<ListAfterSalesVo>({
    url: `/api/v1/c/after-sales`,
    method: 'GET',
    params: query as Record<string, unknown>,
  });
}

export interface AfterSaleDetailVo extends AfterSaleListItemVo {
  evidenceFileIds?: string[];
  rejectReason?: string | null;
  timeline?: Array<{ status: string; createdAt: number; remark?: string | null }>;
}

export function getAfterSaleDetail(afterSaleId: string): Promise<ApiResponse<AfterSaleDetailVo>> {
  return request<AfterSaleDetailVo>({
    url: `/api/v1/c/after-sales/${afterSaleId}`,
    method: 'GET',
  });
}
