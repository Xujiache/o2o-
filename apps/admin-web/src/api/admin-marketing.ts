import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export interface CouponItemVo {
  couponRuleId: string;
  couponName: string;
  couponType: string;
  bizType: string;
  threshold: string;
  discount: string;
  totalStock: number;
  remainStock: number;
  validFrom: number;
  validTo: number;
  status: string;
  createdAt: number;
}

export interface CouponsListVo {
  items: CouponItemVo[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface CouponPublishVo {
  couponRuleId: string;
  status: string;
}

export interface CreateCouponDto {
  couponName: string;
  couponType: 'AMOUNT' | 'DISCOUNT';
  bizType: 'FOOD' | 'ERRAND' | 'ALL';
  threshold: string;
  discount: string;
  totalStock: number;
  validFrom: number;
  validTo: number;
}

export function listCoupons(params?: {
  status?: string;
  bizType?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<CouponsListVo>> {
  return request({ url: '/api/v1/admin/marketing/coupons', method: 'GET', params });
}

export function publishCoupon(dto: CreateCouponDto): Promise<ApiResponse<CouponPublishVo>> {
  return request({ url: '/api/v1/admin/marketing/coupons', method: 'POST', data: dto });
}
