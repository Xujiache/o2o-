import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface AdminAfterSaleListItemVo {
  afterSaleId: string;
  orderId: string;
  storeId: string;
  merchantId: string;
  customerId: string;
  type: string;
  reason: string;
  amountCents: string;
  status: string;
  appliedAt: number;
  merchantReviewAt: number | null;
  createdAt: number;
}

export interface AdminAfterSaleListVo {
  items: AdminAfterSaleListItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface AdminAfterSaleDetailVo extends AdminAfterSaleListItemVo {
  merchantRejectReason: string | null;
  completedAt: number | null;
  evidenceFileIds: string[];
}

export function listAfterSales(params?: {
  status?: string;
  storeId?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<AdminAfterSaleListVo>> {
  return request({ url: '/api/v1/admin/after-sales', method: 'GET', params });
}

export function getAfterSaleDetail(id: string): Promise<ApiResponse<AdminAfterSaleDetailVo>> {
  return request({ url: `/api/v1/admin/after-sales/${id}`, method: 'GET' });
}

export type ArbitrateResponsibleParty = 'MERCHANT' | 'RIDER' | 'CUSTOMER' | 'PLATFORM';
export type ArbitrateDecision = 'APPROVE' | 'REJECT' | 'PARTIAL';

export interface ArbitrateReq {
  responsibleParty: ArbitrateResponsibleParty;
  decision: ArbitrateDecision;
  /** 退款金额（分,字符串） */
  refundAmount: string;
  /** 罚款金额（分,字符串） */
  penalty: string;
  remark?: string;
}

export interface ArbitrateVo {
  afterSaleId: string;
  status: string;
  refundOrderId: string | null;
}

export function arbitrate(id: string, body: ArbitrateReq): Promise<ApiResponse<ArbitrateVo>> {
  return request({ url: `/api/v1/admin/after-sales/${id}/arbitrate`, method: 'POST', data: body });
}
