import type { ApiResponse } from '@o2o/contracts';

import { request } from '@/utils/request';

export const AdminAuthEndpoints = {
  Captcha: '/api/v1/admin/auth/captcha',
  Login: '/api/v1/admin/auth/login',
  Refresh: '/api/v1/admin/auth/refresh',
  Logout: '/api/v1/admin/auth/logout',
} as const;

export interface CaptchaVo {
  captchaId: string;
  svgImage: string;
}

export interface LoginReq {
  username: string;
  password: string;
  captcha: string;
  captchaId: string;
  deviceId?: string;
}

export interface LoginVo {
  adminUserId: string;
  username: string;
  displayName: string;
  adminToken: string;
  refreshToken: string;
  roleCodes: string[];
  permissions: string[];
  menus: string[];
  lastLoginAt: number;
}

export function fetchCaptcha(): Promise<ApiResponse<CaptchaVo>> {
  return request<CaptchaVo>({ url: AdminAuthEndpoints.Captcha, method: 'GET', toastOnBizError: false });
}

export function login(body: LoginReq): Promise<ApiResponse<LoginVo>> {
  return request<LoginVo>({ url: AdminAuthEndpoints.Login, method: 'POST', data: body, toastOnBizError: false });
}

export function logout(): Promise<ApiResponse<{ ok: boolean }>> {
  return request<{ ok: boolean }>({ url: AdminAuthEndpoints.Logout, method: 'POST' });
}
