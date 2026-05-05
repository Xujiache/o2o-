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
  // Stage 3 — 骑手入驻接单配送 5 个事件
  RiderSubmitted: 'domain.rider.submitted',
  RiderApproved: 'domain.rider.approved',
  RiderOnline: 'domain.rider.online',
  RiderOffline: 'domain.rider.offline',
  RiderLocationUpdated: 'domain.rider.location-updated',
  // Stage 4 — 平台管理端 6 个事件
  AdminLoggedIn: 'domain.admin.logged-in',
  RoleChanged: 'domain.role.changed',
  AccountDisabled: 'domain.account.disabled',
  MerchantAudited: 'domain.merchant.audited',
  RiderAudited: 'domain.rider.audited',
  ThirdPartyConfigChanged: 'domain.thirdparty.config-changed',
  // Stage 5 — 用户端外卖交易闭环 6 个事件
  FoodOrderCreated: 'domain.food-order.created',
  PaymentSucceeded: 'domain.payment.succeeded',
  FoodOrderPaid: 'domain.food-order.paid',
  FoodOrderCancelled: 'domain.food-order.cancelled',
  StockReleased: 'domain.stock.released',
  FoodReviewCreated: 'domain.food-review.created',
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

// === Stage 3 — 骑手入驻接单配送事件 payload ===

export interface RiderSubmittedPayload {
  applicationId: string;
  riderId: string;
  mobile: string;
  submittedAt: number;
}

export interface RiderApprovedPayload {
  applicationId: string;
  riderId: string;
  approvedAt: number;
  auditedBy: string;
}

export interface RiderOnlinePayload {
  riderId: string;
  deviceToken?: string;
  platform?: 'android' | 'ios';
  lng?: number;
  lat?: number;
}

export interface RiderOfflinePayload {
  riderId: string;
  reason: 'rider-action' | 'heartbeat-timeout' | 'health-cert-expired' | 'admin-disabled';
}

export interface RiderLocationUpdatedPayload {
  riderId: string;
  batchId: string;
  batchSize: number;
  lastLng: number;
  lastLat: number;
  lastReportedAt: number;
}

// === Stage 4 — 平台管理端事件 payload ===

export interface AdminLoggedInPayload {
  adminUserId: string;
  username: string;
  loggedInAt: number;
  ip?: string;
  deviceId?: string;
}

export interface RoleChangedPayload {
  roleId: string;
  roleCode: string;
  oldPermissionCodes: string[];
  newPermissionCodes: string[];
  operatorAdminId: string;
  changedAt: number;
}

export interface AccountDisabledPayload {
  accountType: 'customer' | 'merchant' | 'rider';
  accountId: string;
  action: 'disable' | 'enable';
  reason?: string;
  operatorAdminId: string;
  operatedAt: number;
}

export interface MerchantAuditedPayload {
  applicationId: string;
  merchantId?: string;
  auditResult: 'approved' | 'rejected';
  rejectReason?: string;
  operatorAdminId: string;
  auditedAt: number;
}

export interface RiderAuditedPayload {
  applicationId: string;
  riderId?: string;
  auditResult: 'approved' | 'rejected';
  rejectReason?: string;
  operatorAdminId: string;
  auditedAt: number;
}

export interface ThirdPartyConfigChangedPayload {
  provider: string;
  changedFields: string[];
  operatorAdminId: string;
  changedAt: number;
}

// === Stage 5 — 用户端外卖交易闭环事件 payload ===

export interface FoodOrderCreatedPayload {
  orderId: string;
  orderNo: string;
  customerId: string;
  storeId: string;
  payableAmount: string;
  expireAt: number;
  createdAt: number;
}

export interface PaymentSucceededPayload {
  payOrderId: string;
  payOrderNo: string;
  bizType: 'FOOD' | 'ERRAND';
  bizId: string;
  payChannel: 'wxpay' | 'alipay';
  paidAmount: string;
  paidAt: number;
}

export interface FoodOrderPaidPayload {
  orderId: string;
  customerId: string;
  storeId: string;
  paidAmount: string;
  paidAt: number;
}

export interface FoodOrderCancelledPayload {
  orderId: string;
  customerId: string;
  reason: string;
  cancelledBy: 'customer' | 'system' | 'merchant' | 'admin';
  cancelledAt: number;
}

export interface StockReleasedPayload {
  orderId: string;
  items: Array<{ skuId: string; quantity: number }>;
  reason: string;
  releasedAt: number;
}

export interface FoodReviewCreatedPayload {
  reviewId: string;
  orderId: string;
  customerId: string;
  storeId: string;
  rating: number;
  createdAt: number;
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
  [EventName.RiderSubmitted]: RiderSubmittedPayload;
  [EventName.RiderApproved]: RiderApprovedPayload;
  [EventName.RiderOnline]: RiderOnlinePayload;
  [EventName.RiderOffline]: RiderOfflinePayload;
  [EventName.RiderLocationUpdated]: RiderLocationUpdatedPayload;
  [EventName.AdminLoggedIn]: AdminLoggedInPayload;
  [EventName.RoleChanged]: RoleChangedPayload;
  [EventName.AccountDisabled]: AccountDisabledPayload;
  [EventName.MerchantAudited]: MerchantAuditedPayload;
  [EventName.RiderAudited]: RiderAuditedPayload;
  [EventName.ThirdPartyConfigChanged]: ThirdPartyConfigChangedPayload;
  [EventName.FoodOrderCreated]: FoodOrderCreatedPayload;
  [EventName.PaymentSucceeded]: PaymentSucceededPayload;
  [EventName.FoodOrderPaid]: FoodOrderPaidPayload;
  [EventName.FoodOrderCancelled]: FoodOrderCancelledPayload;
  [EventName.StockReleased]: StockReleasedPayload;
  [EventName.FoodReviewCreated]: FoodReviewCreatedPayload;
};
