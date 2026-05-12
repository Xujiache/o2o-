import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export type CouponType = 'AMOUNT' | 'DISCOUNT';
export type CouponBizType = 'FOOD' | 'ERRAND' | 'ALL';
export type UserCouponStatus = 'UNUSED' | 'USED' | 'EXPIRED';

export interface AvailableCouponItem {
  couponRuleId: string;
  couponName: string;
  couponType: CouponType;
  bizType: CouponBizType;
  threshold: string;
  discount: string;
  remainStock: number;
  validFrom: number;
  validTo: number;
  alreadyClaimed: boolean;
}
export interface AvailableCouponsPage {
  items: AvailableCouponItem[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface MyCouponItem {
  userCouponId: string;
  couponRuleId: string;
  couponName: string;
  couponType: CouponType;
  bizType: CouponBizType;
  threshold: string;
  discount: string;
  validFrom: number;
  validTo: number;
  status: UserCouponStatus;
  receivedAt: number;
  usedAt: number | null;
}
export interface MyCouponsPage {
  items: MyCouponItem[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface ClaimCouponResult {
  userCouponId: string;
  couponRuleId: string;
}

export interface ListAvailableQuery {
  bizType?: CouponBizType;
  pageNo?: number;
  pageSize?: number;
}
export interface ListMyQuery {
  status?: UserCouponStatus;
  pageNo?: number;
  pageSize?: number;
}

export function listAvailableCoupons(q: ListAvailableQuery = {}): Promise<ApiResponse<AvailableCouponsPage>> {
  return request<AvailableCouponsPage>({
    url: '/api/v1/c/coupons/available',
    method: 'GET',
    params: q as Record<string, unknown>,
  });
}

export function claimCoupon(couponRuleId: string): Promise<ApiResponse<ClaimCouponResult>> {
  return request<ClaimCouponResult>({
    url: `/api/v1/c/coupons/claim/${couponRuleId}`,
    method: 'POST',
    data: {},
  });
}

export function listMyCoupons(q: ListMyQuery = {}): Promise<ApiResponse<MyCouponsPage>> {
  return request<MyCouponsPage>({
    url: '/api/v1/c/coupons/my',
    method: 'GET',
    params: q as Record<string, unknown>,
  });
}
