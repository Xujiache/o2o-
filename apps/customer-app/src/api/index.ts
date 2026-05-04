/**
 * 阶段 0 接口封装。
 * 用户端实际调用:dictionaries / cities / files-upload。
 * audit-logs 与 integrations-health 仅作 endpoint 常量保留(归 admin-web,见 T20)。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request, upload } from '@/utils/request';

/** 接口 endpoint 常量(stage 0 + stage 1) */
export const Endpoints = {
  // stage 0
  Dictionaries: '/api/v1/pub/dictionaries',
  Cities: '/api/v1/pub/cities',
  FilesUpload: '/api/v1/pub/files/upload',
  AdminIntegrationsHealth: '/api/v1/admin/integrations/health',
  AdminAuditLogs: '/api/v1/admin/audit-logs',
  // stage 1 — 用户端
  SmsCode: '/api/v1/c/auth/sms-code',
  Login: '/api/v1/c/auth/login',
  WechatLogin: '/api/v1/c/auth/wechat-login',
  Refresh: '/api/v1/c/auth/refresh',
  Logout: '/api/v1/c/auth/logout',
  RealnameVerify: '/api/v1/c/realname/verify',
  Addresses: '/api/v1/c/addresses',
} as const;

export interface DictItem {
  dictType: string;
  code: string;
  label: string;
  sort: number;
  enabled: boolean;
}

export interface CityItem {
  cityCode: string;
  cityName: string;
  province: string;
  serviceEnabled: boolean;
}

export interface UploadResultVo {
  fileId: string;
  url: string;
  expireAt: number;
  size: number;
}

export function getDictionaries(typeList?: string[]): Promise<ApiResponse<DictItem[]>> {
  return request<DictItem[]>({
    url: Endpoints.Dictionaries,
    method: 'GET',
    params: typeList && typeList.length ? { typeList: typeList.join(',') } : undefined,
    authRequired: false,
  });
}

export function getCities(keyword?: string, enabled?: boolean): Promise<ApiResponse<CityItem[]>> {
  const params: Record<string, unknown> = {};
  if (keyword) params.keyword = keyword;
  if (enabled !== undefined) params.enabled = enabled;
  return request<CityItem[]>({
    url: Endpoints.Cities,
    method: 'GET',
    params,
    authRequired: false,
  });
}

export function uploadFile(filePath: string, bizType: string): Promise<ApiResponse<UploadResultVo>> {
  return upload<UploadResultVo>({ filePath, bizType });
}

// =================== Stage 1 接口 ===================

export type SmsScene = 'login' | 'realname' | 'change-mobile' | 'sensitive';
export type Platform = 'mp-weixin' | 'app-android' | 'app-ios' | 'h5';

export interface SendSmsCodeReq {
  mobile: string;
  scene: SmsScene;
  captchaToken?: string;
}
export interface SendSmsCodeVo {
  sendResult: boolean;
  expireSeconds: number;
  requestId: string;
}

export interface LoginReq {
  mobile: string;
  code: string;
  deviceId: string;
  platform: Platform;
}
export interface LoginVo {
  customerToken: string;
  refreshToken: string;
  isNewUser: boolean;
  profileCompleted: boolean;
}

export interface WechatLoginReq {
  jsCode: string;
  encryptedData?: string;
  iv?: string;
  deviceId: string;
  platform: Platform;
}
export interface WechatLoginVo {
  customerToken: string;
  refreshToken: string;
  bindMobileRequired: boolean;
  isNewUser: boolean;
}

export interface RefreshReq {
  refreshToken: string;
  deviceId: string;
}
export interface RefreshVo {
  customerToken: string;
  refreshToken: string;
}

export interface RealnameVerifyReq {
  realName: string;
  idCardNo: string;
  smsCode: string;
}
export interface RealnameVerifyVo {
  verifyStatus: 'success' | 'failed';
  failedReason?: string;
  verifiedAt?: number;
}

export interface AddressItemVo {
  addressId: string;
  receiverName: string;
  mobileMasked: string;
  cityCode: string;
  detail: string;
  lng: string;
  lat: string;
  isDefault: boolean;
}
export interface AddressPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: AddressItemVo[];
}
export interface UpsertAddressReq {
  addressId?: string;
  receiverName: string;
  mobile: string;
  cityCode: string;
  detail: string;
  lng: number;
  lat: number;
  isDefault: boolean;
}
export interface UpsertAddressVo {
  addressId: string;
  isDefault: boolean;
}

export function sendSmsCode(body: SendSmsCodeReq): Promise<ApiResponse<SendSmsCodeVo>> {
  return request<SendSmsCodeVo>({ url: Endpoints.SmsCode, method: 'POST', data: body, authRequired: false });
}

export function login(body: LoginReq): Promise<ApiResponse<LoginVo>> {
  return request<LoginVo>({ url: Endpoints.Login, method: 'POST', data: body, authRequired: false });
}

export function wechatLogin(body: WechatLoginReq): Promise<ApiResponse<WechatLoginVo>> {
  return request<WechatLoginVo>({ url: Endpoints.WechatLogin, method: 'POST', data: body, authRequired: false });
}

export function refreshToken(body: RefreshReq): Promise<ApiResponse<RefreshVo>> {
  return request<RefreshVo>({ url: Endpoints.Refresh, method: 'POST', data: body, authRequired: false });
}

export function logout(): Promise<ApiResponse<{ ok: boolean }>> {
  return request<{ ok: boolean }>({ url: Endpoints.Logout, method: 'POST', data: {} });
}

export function realnameVerify(body: RealnameVerifyReq): Promise<ApiResponse<RealnameVerifyVo>> {
  return request<RealnameVerifyVo>({ url: Endpoints.RealnameVerify, method: 'POST', data: body });
}

export function getAddresses(pageNo = 1, pageSize = 20): Promise<ApiResponse<AddressPageVo>> {
  return request<AddressPageVo>({ url: Endpoints.Addresses, method: 'GET', params: { pageNo, pageSize } });
}

export function upsertAddress(body: UpsertAddressReq): Promise<ApiResponse<UpsertAddressVo>> {
  return request<UpsertAddressVo>({ url: Endpoints.Addresses, method: 'POST', data: body });
}
