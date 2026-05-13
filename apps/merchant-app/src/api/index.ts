/**
 * 商家端接口封装。
 */
import type { ApiResponse } from '@o2o/contracts';

import { request, upload } from '@/utils/request';

export const Endpoints = {
  // 公共接口
  Dictionaries: '/api/v1/pub/dictionaries',
  Cities: '/api/v1/pub/cities',
  FilesUpload: '/api/v1/pub/files/upload',
  AdminIntegrationsHealth: '/api/v1/admin/integrations/health',
  AdminAuditLogs: '/api/v1/admin/audit-logs',
  // 商家端接口
  SmsCode: '/api/v1/m/auth/sms-code',
  Login: '/api/v1/m/auth/login',
  Refresh: '/api/v1/m/auth/refresh',
  Logout: '/api/v1/m/auth/logout',
  OnboardingApply: '/api/v1/m/onboarding/applications',
  OnboardingStatus: '/api/v1/m/onboarding/status',
  Store: '/api/v1/m/store',
  StoreSettings: '/api/v1/m/store/settings',
  StoreBusinessStatus: '/api/v1/m/store/business-status',
  ProductCategories: '/api/v1/m/product-categories',
  Products: '/api/v1/m/products',
  StockAlerts: '/api/v1/m/stock/alerts',
  Promotions: '/api/v1/m/promotions',
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

// =================== 商家端接口 ===================

export type Platform = 'app-android' | 'app-ios';

export interface SendSmsCodeReq {
  mobile: string;
  scene: 'login' | 'realname' | 'change-mobile' | 'sensitive';
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
  merchantToken: string;
  refreshToken: string;
  accountStatus: 'pending' | 'active' | 'disabled';
}

export interface RefreshReq {
  refreshToken: string;
  deviceId: string;
}
export interface RefreshVo {
  merchantToken: string;
  refreshToken: string;
}

export interface SubmitApplicationReq {
  mobile: string;
  smsCode: string;
  licenseFileId: string;
  foodPermitFileId?: string;
  idCardFrontFileId: string;
  idCardBackFileId: string;
  storePhotoFileIds: string[];
  legalPerson: string;
  idCardNo: string;
  licenseNo: string;
  foodPermitNo?: string;
  storeName: string;
  businessScope: string;
}
export interface SubmitApplicationVo {
  applicationId: string;
  auditStatus: string;
  submittedAt: number;
}
export interface OnboardingStatusVo {
  auditStatus: 'pending' | 'approved' | 'rejected' | 'disabled';
  rejectReason?: string | null;
  canResubmit: boolean;
  lastSubmittedAt?: string | null;
  storeName?: string | null;
  legalPerson?: string;
}

export interface BusinessHourDto {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}
export interface DeliveryAreaDto {
  geometry: { type: 'Polygon'; coordinates: number[][][] };
  minOrderAmount: number;
  deliveryFee: number;
}
export interface StoreVo {
  storeId: string;
  merchantId: string;
  name: string;
  avatarFileId?: string | null;
  avatarUrl?: string | null;
  intro?: string | null;
  businessScope: string;
  businessStatus: 'online' | 'offline' | 'paused';
  minOrderAmount: string;
  deliveryFee: string;
  notice?: string | null;
  cityCode?: string | null;
  businessHours: BusinessHourDto[];
  deliveryAreas: DeliveryAreaDto[];
}
export interface UpdateStoreSettingsReq {
  avatarFileId?: string;
  name?: string;
  intro?: string;
  businessHours?: BusinessHourDto[];
  deliveryAreas?: DeliveryAreaDto[];
  minOrderAmount?: number;
  deliveryFee?: number;
  notice?: string;
}
export interface SetBusinessStatusReq {
  businessStatus: 'online' | 'offline';
  reason?: string;
}

export interface CategoryVo {
  categoryId: string;
  storeId: string;
  name: string;
  displayOrder: number;
}
export interface SkuReq {
  specValue: string;
  price: number;
  stock: number;
  /** 规格重量(克),null/不传 = 不按重量销售 */
  weightGrams?: number | null;
}
export interface CreateProductReq {
  categoryId: string;
  name: string;
  description?: string;
  coverImageFileId?: string;
  images?: string[];
  hasSku: 0 | 1;
  price?: number;
  stock?: number;
  stockAlertThreshold?: number;
  skus?: SkuReq[];
  saleStatus?: 'draft' | 'on_shelf';
}
export interface ProductItemVo {
  productId: string;
  storeId: string;
  categoryId: string;
  name: string;
  price: string;
  stock: number;
  saleStatus: string;
  hasSku: number;
  coverImageFileId?: string | null;
  imageUrl?: string | null;
}

export interface ProductSkuVo {
  skuId: string;
  productId: string;
  specValue: string;
  price: string;
  stock: number;
  stockLocked: number;
  /** 规格重量(克),null = 不按重量销售 */
  weightGrams?: number | null;
}

export interface MerchantProductDetailVo {
  productId: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string | null;
  coverImageFileId: string | null;
  imageUrl: string | null;
  images: string[] | null;
  price: string;
  originalPrice: string | null;
  stock: number;
  stockAlertThreshold: number;
  hasSku: number;
  saleStatus: string;
  skus: ProductSkuVo[];
}

export interface UpdateProductReq {
  categoryId?: string;
  name?: string;
  description?: string;
  coverImageFileId?: string;
  images?: string[];
  price?: number;
  stock?: number;
  stockAlertThreshold?: number;
}
export interface ProductPageVo {
  pageNo: number;
  pageSize: number;
  total: number;
  list: ProductItemVo[];
}
export interface StockAlertItemVo {
  productId: string;
  storeId: string;
  productName: string;
  currentStock: number;
  threshold: number;
}
export interface PromotionItemVo {
  promoId: string;
  storeId: string;
  promoType: 'time_limited' | 'single_full_off';
  name: string;
  productIds: string[];
  status: string;
  startTime: string;
  endTime: string;
}
export interface CreatePromotionReq {
  promoType: 'time_limited' | 'single_full_off';
  name: string;
  productIds: string[];
  rules: unknown;
  startTime: number;
  endTime: number;
}

export function sendSmsCode(body: SendSmsCodeReq): Promise<ApiResponse<SendSmsCodeVo>> {
  return request<SendSmsCodeVo>({ url: Endpoints.SmsCode, method: 'POST', data: body, authRequired: false });
}

export function login(body: LoginReq): Promise<ApiResponse<LoginVo>> {
  return request<LoginVo>({ url: Endpoints.Login, method: 'POST', data: body, authRequired: false });
}

export function refreshToken(body: RefreshReq): Promise<ApiResponse<RefreshVo>> {
  return request<RefreshVo>({ url: Endpoints.Refresh, method: 'POST', data: body, authRequired: false });
}

export function logout(): Promise<ApiResponse<{ ok: boolean }>> {
  return request<{ ok: boolean }>({ url: Endpoints.Logout, method: 'POST', data: {} });
}

export function submitApplication(body: SubmitApplicationReq): Promise<ApiResponse<SubmitApplicationVo>> {
  return request<SubmitApplicationVo>({
    url: Endpoints.OnboardingApply,
    method: 'POST',
    data: body,
    authRequired: false,
  });
}

export function getOnboardingStatus(): Promise<ApiResponse<OnboardingStatusVo>> {
  return request<OnboardingStatusVo>({ url: Endpoints.OnboardingStatus, method: 'GET' });
}

export function getStore(): Promise<ApiResponse<StoreVo>> {
  return request<StoreVo>({ url: Endpoints.Store, method: 'GET' });
}

export function updateStoreSettings(
  body: UpdateStoreSettingsReq,
): Promise<ApiResponse<{ storeId: string; updatedAt: number }>> {
  return request({ url: Endpoints.StoreSettings, method: 'PATCH' as const, data: body as never });
}

export function setBusinessStatus(body: SetBusinessStatusReq): Promise<ApiResponse<unknown>> {
  return request({ url: Endpoints.StoreBusinessStatus, method: 'PATCH' as const, data: body as never });
}

export function listCategories(): Promise<ApiResponse<CategoryVo[]>> {
  return request<CategoryVo[]>({ url: Endpoints.ProductCategories, method: 'GET' });
}

export function createCategory(body: { name: string; displayOrder?: number }): Promise<ApiResponse<CategoryVo>> {
  return request<CategoryVo>({ url: Endpoints.ProductCategories, method: 'POST', data: body });
}

export function updateCategory(
  categoryId: string,
  body: { name?: string; displayOrder?: number },
): Promise<ApiResponse<CategoryVo>> {
  return request<CategoryVo>({
    url: `${Endpoints.ProductCategories}/${categoryId}`,
    method: 'PATCH' as const,
    data: body as never,
  });
}

export function deleteCategory(categoryId: string): Promise<ApiResponse<{ ok: boolean }>> {
  return request<{ ok: boolean }>({
    url: `${Endpoints.ProductCategories}/${categoryId}`,
    method: 'DELETE' as const,
  });
}

export function listProducts(params: {
  categoryId?: string;
  saleStatus?: string;
  keyword?: string;
  pageNo?: number;
  pageSize?: number;
}): Promise<ApiResponse<ProductPageVo>> {
  return request<ProductPageVo>({ url: Endpoints.Products, method: 'GET', params });
}

export function createProduct(body: CreateProductReq): Promise<ApiResponse<{ productId: string; saleStatus: string }>> {
  return request({ url: Endpoints.Products, method: 'POST', data: body as never });
}

export function getMerchantProductDetail(productId: string): Promise<ApiResponse<MerchantProductDetailVo>> {
  return request<MerchantProductDetailVo>({
    url: `${Endpoints.Products}/${productId}`,
    method: 'GET',
  });
}

export function updateProduct(productId: string, body: UpdateProductReq): Promise<ApiResponse<{ productId: string }>> {
  return request<{ productId: string }>({
    url: `${Endpoints.Products}/${productId}`,
    method: 'PATCH' as const,
    data: body as never,
  });
}

export function setSaleStatus(productId: string, saleStatus: 'on_shelf' | 'off_shelf'): Promise<ApiResponse<unknown>> {
  return request({
    url: `${Endpoints.Products}/${productId}/sale-status`,
    method: 'PATCH' as const,
    data: { saleStatus } as never,
  });
}

export function batchSetSaleStatus(
  productIds: string[],
  saleStatus: 'on_shelf' | 'off_shelf',
): Promise<ApiResponse<{ updated: number }>> {
  return request<{ updated: number }>({
    url: `${Endpoints.Products}/batch-sale-status`,
    method: 'PATCH' as const,
    data: { productIds, saleStatus } as never,
  });
}

export function listStockAlerts(): Promise<ApiResponse<StockAlertItemVo[]>> {
  return request<StockAlertItemVo[]>({ url: Endpoints.StockAlerts, method: 'GET' });
}

export function setStockThreshold(productId: string, threshold: number): Promise<ApiResponse<unknown>> {
  return request({
    url: `/api/v1/m/stock/products/${productId}/threshold`,
    method: 'PATCH' as const,
    data: { threshold } as never,
  });
}

export function listPromotions(status?: string): Promise<ApiResponse<PromotionItemVo[]>> {
  return request<PromotionItemVo[]>({
    url: Endpoints.Promotions,
    method: 'GET',
    params: status ? { status } : undefined,
  });
}

export function createPromotion(body: CreatePromotionReq): Promise<ApiResponse<{ promoId: string; status: string }>> {
  return request({ url: Endpoints.Promotions, method: 'POST', data: body as never });
}

export function setPromoStatus(promoId: string, status: string): Promise<ApiResponse<unknown>> {
  return request({
    url: `${Endpoints.Promotions}/${promoId}/status`,
    method: 'PATCH' as const,
    data: { status } as never,
  });
}
