/**
 * 骑手端接口封装。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request, upload } from '@/utils/request';

export const Endpoints = {
  // 公共接口
  Dictionaries: '/api/v1/pub/dictionaries',
  Cities: '/api/v1/pub/cities',
  FilesUpload: '/api/v1/pub/files/upload',
  // 骑手端接口
  SmsCode: '/api/v1/r/auth/sms-code',
  Login: '/api/v1/r/auth/login',
  Refresh: '/api/v1/r/auth/refresh',
  Logout: '/api/v1/r/auth/logout',
  OnboardingApply: '/api/v1/r/onboarding/applications',
  OnboardingStatus: '/api/v1/r/onboarding/status',
  Profile: '/api/v1/r/profile',
  OnlineStatus: '/api/v1/r/online-status',
  LocationBatch: '/api/v1/r/location/batch',
  TasksAvailable: '/api/v1/r/tasks/available',
} as const;

export interface DictItem {
  dictType: string;
  code: string;
  label: string;
  sort: number;
  enabled: boolean;
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

export function uploadFile(filePath: string, bizType: string): Promise<ApiResponse<UploadResultVo>> {
  return upload<UploadResultVo>({ filePath, bizType });
}

// =================== 骑手端接口 ===================

export type Platform = 'app-android' | 'app-ios';

export interface SendSmsCodeReq {
  mobile: string;
  scene: 'login' | 'sensitive';
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
  riderId: string;
  riderToken: string;
  refreshToken: string;
  accountStatus: 'active' | 'disabled';
  isNewUser: boolean;
  hasApplication: boolean;
  latestApplicationId?: string;
}

export interface RefreshReq {
  refreshToken: string;
  deviceId: string;
}
export interface RefreshVo {
  riderToken: string;
  refreshToken: string;
}

export type CertType =
  | 'id_card_front'
  | 'id_card_back'
  | 'face_video'
  | 'health_cert'
  | 'driver_license'
  | 'vehicle_license';

export type VehicleType = 'electric_bike' | 'motorcycle' | 'car';

export interface CertItem {
  certType: CertType;
  fileObjectId: string;
}

export interface VehicleInfo {
  vehicleType: VehicleType;
  plateNo?: string;
  brand?: string;
}

export interface SubmitApplicationReq {
  realName: string;
  idCardNo: string;
  healthCertNo: string;
  healthCertExpiry: number;
  vehicle: VehicleInfo;
  certificates: CertItem[];
}
export interface SubmitApplicationVo {
  applicationId: string;
  auditStatus: string;
  submittedAt: number;
}

export interface OnboardingStatusVo {
  hasApplication: boolean;
  applicationId?: string;
  auditStatus?: 'pending' | 'approved' | 'rejected' | 'disabled';
  rejectReason?: string | null;
  canResubmit: boolean;
  submittedAt?: string;
  realName?: string;
}

export interface RiderProfileVo {
  riderId: string;
  mobile: string;
  accountStatus: string;
  realName?: string | null;
  healthCertExpiry?: string | null;
  approvedAt?: string | null;
  vehicle?: { vehicleType: string; plateNo?: string | null; brand?: string | null } | null;
  creditScore: number;
  onlineStatus: 'online' | 'offline' | 'busy';
}

export interface UpdateProfileReq {
  vehicle?: VehicleInfo;
}

export interface OnlineStatusReq {
  targetStatus: 'online' | 'offline';
  deviceToken?: string;
  platform?: 'android' | 'ios';
  currentLng?: number;
  currentLat?: number;
}
export interface OnlineStatusVo {
  riderStatus: string;
  canAcceptOrder: boolean;
  reason?: string;
}

export interface LocationPoint {
  lng: number;
  lat: number;
  accuracy?: number;
  reportedAt: number;
}

export interface LocationBatchReq {
  batchId: string;
  points: LocationPoint[];
}
export interface LocationBatchVo {
  acceptedCount: number;
  serverTime: number;
}

export interface TaskItemVo {
  taskId: string;
  bizType: 'takeaway' | 'errand';
  distance: number;
  reward: number;
  deadline: number;
  pickupAddress: { lng: number; lat: number; text: string };
  deliveryAddress: { lng: number; lat: number; text: string };
}
export interface TaskPoolVo {
  items: TaskItemVo[];
  total: number;
}

export function sendSmsCode(body: SendSmsCodeReq): Promise<ApiResponse<SendSmsCodeVo>> {
  return request<SendSmsCodeVo>({
    url: Endpoints.SmsCode,
    method: 'POST',
    data: body as unknown as Record<string, unknown>,
    authRequired: false,
  });
}

export function login(body: LoginReq): Promise<ApiResponse<LoginVo>> {
  return request<LoginVo>({
    url: Endpoints.Login,
    method: 'POST',
    data: body as unknown as Record<string, unknown>,
    authRequired: false,
  });
}

export function refreshToken(body: RefreshReq): Promise<ApiResponse<RefreshVo>> {
  return request<RefreshVo>({
    url: Endpoints.Refresh,
    method: 'POST',
    data: body as unknown as Record<string, unknown>,
    authRequired: false,
  });
}

export function logout(): Promise<ApiResponse<null>> {
  return request<null>({
    url: Endpoints.Logout,
    method: 'POST',
  });
}

export function submitOnboardingApplication(body: SubmitApplicationReq): Promise<ApiResponse<SubmitApplicationVo>> {
  return request<SubmitApplicationVo>({
    url: Endpoints.OnboardingApply,
    method: 'POST',
    data: body as unknown as Record<string, unknown>,
  });
}

export function getOnboardingStatus(): Promise<ApiResponse<OnboardingStatusVo>> {
  return request<OnboardingStatusVo>({ url: Endpoints.OnboardingStatus, method: 'GET' });
}

export function getProfile(): Promise<ApiResponse<RiderProfileVo>> {
  return request<RiderProfileVo>({ url: Endpoints.Profile, method: 'GET' });
}

export function updateProfile(body: UpdateProfileReq): Promise<ApiResponse<null>> {
  return request<null>({
    url: Endpoints.Profile,
    method: 'PATCH',
    data: body as unknown as Record<string, unknown>,
  });
}

export function updateOnlineStatus(body: OnlineStatusReq): Promise<ApiResponse<OnlineStatusVo>> {
  return request<OnlineStatusVo>({
    url: Endpoints.OnlineStatus,
    method: 'PATCH',
    data: body as unknown as Record<string, unknown>,
  });
}

export function reportLocationBatch(body: LocationBatchReq): Promise<ApiResponse<LocationBatchVo>> {
  return request<LocationBatchVo>({
    url: Endpoints.LocationBatch,
    method: 'POST',
    data: body as unknown as Record<string, unknown>,
  });
}

export function getAvailableTasks(params?: {
  bizType?: 'takeaway' | 'errand';
  radius?: number;
  page?: number;
  size?: number;
}): Promise<ApiResponse<TaskPoolVo>> {
  return request<TaskPoolVo>({ url: Endpoints.TasksAvailable, method: 'GET', params });
}
