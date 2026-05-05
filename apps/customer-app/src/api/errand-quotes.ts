import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface ErrandAddress {
  address: string;
  name?: string;
  mobile?: string;
  lng?: number;
  lat?: number;
}

export interface QuoteErrandReq {
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  pickupAddress?: ErrandAddress;
  deliveryAddress: ErrandAddress;
  weight?: number;
  urgentLevel: 'standard' | 'fast' | 'express';
  budget?: number;
  reservedTime?: number;
  itemDesc?: string;
  taskDesc?: string;
}

export interface ProhibitedWarning {
  keyword: string;
  level: 'WARN' | 'REJECT';
  description: string;
}

export interface QuoteVo {
  quoteId: string;
  baseFee: string;
  distanceFee: string;
  urgentFee: string;
  payableAmount: string;
  expireAt: number;
  prohibitedWarnings: ProhibitedWarning[];
  distanceMeters: number;
}

export function quoteErrand(body: QuoteErrandReq): Promise<ApiResponse<QuoteVo>> {
  return request<QuoteVo>({ url: '/api/v1/c/errand/quotes', method: 'POST', data: body });
}
