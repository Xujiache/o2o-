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
  // Stage 6 — 用户端跑腿交易闭环 6 个事件
  ErrandQuoteCreated: 'domain.errand-quote.created',
  ErrandOrderCreated: 'domain.errand-order.created',
  ErrandPaid: 'domain.errand-order.paid',
  ErrandPriceIncreased: 'domain.errand-order.price-increased',
  ErrandNoRiderCancelled: 'domain.errand-order.no-rider-cancelled',
  ErrandRemarkAdded: 'domain.errand-order.remark-added',
  // Stage 7 — 商家端订单售后结算 9 个事件(7 规划 + 2 c 端扩展)
  MerchantOrderPushed: 'domain.merchant-order.pushed',
  MerchantOrderAccepted: 'domain.merchant-order.accepted',
  MerchantOrderRejected: 'domain.merchant-order.rejected',
  FoodReadyForPickup: 'domain.food-order.ready-for-pickup',
  AfterSaleApplied: 'domain.after-sale.applied',
  AfterSaleReviewedByMerchant: 'domain.after-sale.reviewed-by-merchant',
  OrderReviewSubmitted: 'domain.order-review.submitted',
  MerchantSettlementGenerated: 'domain.merchant-settlement.generated',
  MerchantWithdrawRequested: 'domain.merchant-withdrawal.requested',
  // Stage 8 — 骑手端调度轨迹收益考核 7 个事件
  DispatchStarted: 'domain.dispatch.started',
  RiderTaskAccepted: 'domain.rider-task.accepted',
  RiderArrivedPickup: 'domain.rider-task.arrived-pickup',
  RiderPickedUp: 'domain.rider-task.picked-up',
  RiderDelivered: 'domain.rider-task.delivered',
  RiderExceptionReported: 'domain.rider-task.exception-reported',
  RiderEarningGenerated: 'domain.rider-earning.generated',
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

// === Stage 6 — 用户端跑腿交易闭环事件 payload ===

export interface ErrandQuoteCreatedPayload {
  quoteId: string;
  customerId: string;
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  payableAmount: string;
  expireAt: number;
  createdAt: number;
}

export interface ErrandOrderCreatedPayload {
  orderId: string;
  orderNo: string;
  customerId: string;
  typeCode: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';
  payableAmount: string;
  expireAt: number;
  createdAt: number;
}

export interface ErrandPaidPayload {
  orderId: string;
  customerId: string;
  paidAmount: string;
  paidAt: number;
}

export interface ErrandPriceIncreasedPayload {
  orderId: string;
  customerId: string;
  oldUrgentLevel: 'standard' | 'fast' | 'express';
  newUrgentLevel: 'standard' | 'fast' | 'express';
  oldPayable: string;
  newPayable: string;
  source: 'customer' | 'system';
  changedAt: number;
}

export interface ErrandNoRiderCancelledPayload {
  orderId: string;
  customerId: string;
  payOrderId: string | null;
  refundAmount: string;
  cancelledAt: number;
}

export interface ErrandRemarkAddedPayload {
  orderId: string;
  customerId: string;
  remark: string;
  attachmentCount: number;
  addedAt: number;
}

// === Stage 7 — 商家端订单售后结算事件 payload ===

export interface MerchantOrderPushedPayload {
  orderId: string;
  storeId: string;
  merchantId: string;
  payableAmountCents: string;
  pushedAt: number;
}

export interface MerchantOrderAcceptedPayload {
  orderId: string;
  storeId: string;
  merchantId: string;
  expectedReadyAt: number | null;
  acceptedAt: number;
}

export interface MerchantOrderRejectedPayload {
  orderId: string;
  storeId: string;
  merchantId: string;
  rejectReason: string;
  rejectedAt: number;
}

export interface FoodReadyForPickupPayload {
  orderId: string;
  storeId: string;
  merchantId: string;
  readyAt: number;
}

export interface AfterSaleAppliedPayload {
  afterSaleId: string;
  orderId: string;
  storeId: string;
  merchantId: string;
  customerId: string;
  amountCents: string;
  reason: string;
  appliedAt: number;
}

export interface AfterSaleReviewedByMerchantPayload {
  afterSaleId: string;
  orderId: string;
  storeId: string;
  decision: 'APPROVE' | 'REJECT';
  rejectReason: string | null;
  reviewedAt: number;
}

export interface OrderReviewSubmittedPayload {
  reviewId: string;
  orderId: string;
  storeId: string;
  merchantId: string;
  customerId: string;
  rating: number;
  submittedAt: number;
}

export interface MerchantSettlementGeneratedPayload {
  settlementId: string;
  storeId: string;
  merchantId: string;
  periodStart: number;
  periodEnd: number;
  netCents: string;
  generatedAt: number;
}

export interface MerchantWithdrawRequestedPayload {
  withdrawalId: string;
  storeId: string;
  merchantId: string;
  amountCents: string;
  requestedAt: number;
}

// === Stage 8 — 骑手端调度轨迹收益考核事件 payload ===

export interface DispatchStartedPayload {
  dispatchTaskId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  bizTaskId: string | null;
  candidateRiderIds: string[];
  dispatchedAt: number;
}

export interface RiderTaskAcceptedPayload {
  riderTaskId: string;
  dispatchTaskId: string;
  riderId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  acceptedAt: number;
}

export interface RiderArrivedPickupPayload {
  riderTaskId: string;
  riderId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  lng: number;
  lat: number;
  arrivedAt: number;
}

export interface RiderPickedUpPayload {
  riderTaskId: string;
  riderId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  pickedUpAt: number;
}

export interface RiderDeliveredPayload {
  riderTaskId: string;
  riderId: string;
  bizType: 'FOOD' | 'ERRAND';
  bizOrderId: string;
  deliveryProof: string | null;
  deliveredAt: number;
}

export interface RiderExceptionReportedPayload {
  riderViolationId: string;
  riderTaskId: string;
  riderId: string;
  exceptionType: 'EXCEPTION' | 'LATE' | 'COMPLAINT' | 'FRAUD';
  description: string;
  platformHandleRequired: boolean;
  reportedAt: number;
}

export interface RiderEarningGeneratedPayload {
  riderEarningId: string;
  riderId: string;
  settleDate: number;
  totalAmount: string;
  generatedAt: number;
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
  [EventName.ErrandQuoteCreated]: ErrandQuoteCreatedPayload;
  [EventName.ErrandOrderCreated]: ErrandOrderCreatedPayload;
  [EventName.ErrandPaid]: ErrandPaidPayload;
  [EventName.ErrandPriceIncreased]: ErrandPriceIncreasedPayload;
  [EventName.ErrandNoRiderCancelled]: ErrandNoRiderCancelledPayload;
  [EventName.ErrandRemarkAdded]: ErrandRemarkAddedPayload;
  [EventName.MerchantOrderPushed]: MerchantOrderPushedPayload;
  [EventName.MerchantOrderAccepted]: MerchantOrderAcceptedPayload;
  [EventName.MerchantOrderRejected]: MerchantOrderRejectedPayload;
  [EventName.FoodReadyForPickup]: FoodReadyForPickupPayload;
  [EventName.AfterSaleApplied]: AfterSaleAppliedPayload;
  [EventName.AfterSaleReviewedByMerchant]: AfterSaleReviewedByMerchantPayload;
  [EventName.OrderReviewSubmitted]: OrderReviewSubmittedPayload;
  [EventName.MerchantSettlementGenerated]: MerchantSettlementGeneratedPayload;
  [EventName.MerchantWithdrawRequested]: MerchantWithdrawRequestedPayload;
  [EventName.DispatchStarted]: DispatchStartedPayload;
  [EventName.RiderTaskAccepted]: RiderTaskAcceptedPayload;
  [EventName.RiderArrivedPickup]: RiderArrivedPickupPayload;
  [EventName.RiderPickedUp]: RiderPickedUpPayload;
  [EventName.RiderDelivered]: RiderDeliveredPayload;
  [EventName.RiderExceptionReported]: RiderExceptionReportedPayload;
  [EventName.RiderEarningGenerated]: RiderEarningGeneratedPayload;
};
