/**
 * 5 个领域事件 — 定义在 `项目阶段规划/00-阶段0-...后端数据任务事件.md` § 领域事件。
 * 事件名称遵循 `domain.<biz>.<verb>` 风格。
 */

export const EventName = {
  ConfigChanged: 'domain.config.changed',
  PermissionChanged: 'domain.permission.changed',
  FileUploaded: 'domain.file.uploaded',
  ThirdPartyCallbackReceived: 'domain.third-party.callback.received',
  AuditLogCreated: 'domain.audit-log.created',
  // Stage 1 — 用户账号 5 个事件(沿用 domain.<biz>.<verb> 风格)
  CustomerRegistered: 'domain.customer.registered',
  CustomerLoggedIn: 'domain.customer.logged-in',
  CustomerRealnameVerified: 'domain.customer.realname-verified',
  CustomerAddressChanged: 'domain.customer.address-changed',
  CustomerAccountDisabled: 'domain.customer.account-disabled',
  // Stage 2 — 商家入驻店铺商品 6 个事件
  MerchantSubmitted: 'domain.merchant.submitted',
  MerchantApproved: 'domain.merchant.approved',
  StoreStatusChanged: 'domain.store.status-changed',
  ProductCreated: 'domain.product.created',
  ProductOnSale: 'domain.product.on-sale',
  StockLow: 'domain.stock.low',
} as const;

export type EventName = (typeof EventName)[keyof typeof EventName];

export interface ConfigChangedPayload {
  configKey: string;
  oldValue: string | null;
  newValue: string | null;
  operator: string;
}

export interface PermissionChangedPayload {
  roleId: string;
  permissionId: string;
  action: 'grant' | 'revoke';
}

export interface FileUploadedPayload {
  fileId: string;
  bizType: string;
  ownerType: string;
  ownerId: string;
}

export interface ThirdPartyCallbackReceivedPayload {
  provider: string;
  callbackId: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface AuditLogCreatedPayload {
  auditLogId: string;
  traceId: string;
  targetType: string;
  targetId: string | null;
}

// === Stage 1 — 用户账号事件 payload ===

export interface CustomerRegisteredPayload {
  userId: string;
  mobile: string;
  registerSource: 'mobile' | 'wechat';
  deviceId?: string;
}

export interface CustomerLoggedInPayload {
  userId: string;
  deviceId: string;
  ip: string;
  city?: string;
  scene: 'login' | 'wechat-login' | 'refresh';
}

export interface CustomerRealnameVerifiedPayload {
  userId: string;
  verifiedAt: number;
}

export interface CustomerAddressChangedPayload {
  userId: string;
  addressId: string;
  action: 'create' | 'update' | 'set-default';
}

export interface CustomerAccountDisabledPayload {
  userId: string;
  operatorId: string;
  reason: string;
}

// === Stage 2 — 商家入驻店铺商品事件 payload ===

export interface MerchantSubmittedPayload {
  merchantId: string;
  applicationId: string;
  submittedAt: number;
}

export interface MerchantApprovedPayload {
  merchantId: string;
  applicationId: string;
  commissionRate: number;
  approvedAt: number;
  auditedBy: string;
}

export interface StoreStatusChangedPayload {
  storeId: string;
  merchantId: string;
  beforeStatus: string;
  afterStatus: string;
  effectiveAt: number;
  operatorType: 'merchant' | 'admin' | 'system';
  reason?: string;
}

export interface ProductCreatedPayload {
  productId: string;
  storeId: string;
  categoryId: string;
  createdAt: number;
}

export interface ProductOnSalePayload {
  productId: string;
  storeId: string;
  saleStatus: 'on_shelf' | 'off_shelf' | 'sold_out';
  changedAt: number;
}

export interface StockLowPayload {
  productId: string;
  storeId: string;
  currentStock: number;
  threshold: number;
}

export type EventPayloadMap = {
  [EventName.ConfigChanged]: ConfigChangedPayload;
  [EventName.PermissionChanged]: PermissionChangedPayload;
  [EventName.FileUploaded]: FileUploadedPayload;
  [EventName.ThirdPartyCallbackReceived]: ThirdPartyCallbackReceivedPayload;
  [EventName.AuditLogCreated]: AuditLogCreatedPayload;
  [EventName.CustomerRegistered]: CustomerRegisteredPayload;
  [EventName.CustomerLoggedIn]: CustomerLoggedInPayload;
  [EventName.CustomerRealnameVerified]: CustomerRealnameVerifiedPayload;
  [EventName.CustomerAddressChanged]: CustomerAddressChangedPayload;
  [EventName.CustomerAccountDisabled]: CustomerAccountDisabledPayload;
  [EventName.MerchantSubmitted]: MerchantSubmittedPayload;
  [EventName.MerchantApproved]: MerchantApprovedPayload;
  [EventName.StoreStatusChanged]: StoreStatusChangedPayload;
  [EventName.ProductCreated]: ProductCreatedPayload;
  [EventName.ProductOnSale]: ProductOnSalePayload;
  [EventName.StockLow]: StockLowPayload;
};
