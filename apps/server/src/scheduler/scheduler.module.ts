import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AccountDisableRecord,
  CustomerAddress,
  CustomerUser,
  DispatchTask,
  ErrandOrder,
  ErrandTask,
  ErrandTimeline,
  FoodOrder,
  IdempotencyRecord,
  IntegrationRequestLog,
  LoginDevice,
  MerchantLicense,
  MerchantPromotion,
  MerchantSettlement,
  MerchantStatisticsSnapshot,
  MerchantWithdrawal,
  OrderReview,
  OrderTimeline,
  PaymentOrder,
  Product,
  ProductSku,
  RealnameRecord,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderEarning,
  RiderLocation,
  RiderStatus,
  RiderTask,
  RiderViolation,
  SmsCode,
  StockLock,
  Store,
  SysAuditLog,
  SysConfig,
  TrackPoint,
  // Stage 9
  CouponRule,
  DashboardSnapshot,
  ExportTask,
  RefundOrder,
  RiskExceptionLog,
} from '../database/entities';
import { AuthEntitiesModule } from '../modules/auth/auth-entities.module';
import { ErrandDispatchModule } from '../modules/errand-dispatch/errand-dispatch.module';
import { IntegrationGatewayModule } from '../modules/integration-gateway/integration-gateway.module';

import { DistributedLockService } from './distributed-lock.service';
import { AuditLogArchiveJob } from './jobs/audit-log-archive.job';
import { ConfigCacheRefreshJob } from './jobs/config-cache-refresh.job';
import { ConfigChangeAggregateJob } from './jobs/config-change-aggregate.job';
import { CouponExpireJob } from './jobs/coupon-expire.job';
import { DailyStatisticsSnapshotJob } from './jobs/daily-statistics-snapshot.job';
import { DashboardSnapshotGenerateJob } from './jobs/dashboard-snapshot-generate.job';
import { DefaultAddressUniquenessJob } from './jobs/default-address-uniqueness.job';
import { DeliveryTimeoutMarkJob } from './jobs/delivery-timeout-mark.job';
import { DisabledAccountTokenBroadcastJob } from './jobs/disabled-account-token-broadcast.job';
import { DispatchTimeoutRetryJob } from './jobs/dispatch-timeout-retry.job';
import { ExpiredCleanupJob } from './jobs/expired-cleanup.job';
import { ExportTaskProcessJob } from './jobs/export-task-process.job';
import { LicenseExpiryReminderJob } from './jobs/license-expiry-reminder.job';
import { LoginAnomalyDetectionJob } from './jobs/login-anomaly-detection.job';
import { MarketingActivityToggleJob } from './jobs/marketing-activity-toggle.job';
import { MerchantAcceptRemindJob } from './jobs/merchant-accept-remind.job';
import { MerchantAcceptTimeoutCancelJob } from './jobs/merchant-accept-timeout-cancel.job';
import { NoRiderCancelJob } from './jobs/no-rider-cancel.job';
import { NoRiderPriceIncreaseJob } from './jobs/no-rider-price-increase.job';
import { PaymentCallbackRetryJob } from './jobs/payment-callback-retry.job';
import { PromoEndJob } from './jobs/promo-end.job';
import { PromoStartJob } from './jobs/promo-start.job';
import { RealnameRetryJob } from './jobs/realname-retry.job';
import { ReconciliationJob } from './jobs/reconciliation.job';
import { ReservedErrandDispatchJob } from './jobs/reserved-errand-dispatch.job';
import { ReservedOrderDispatchJob } from './jobs/reserved-order-dispatch.job';
import { RiderAuditTimeoutReminderJob } from './jobs/rider-audit-timeout-reminder.job';
import { RiderEarningDailySettleJob } from './jobs/rider-earning-daily-settle.job';
import { RiderHealthCertExpiryReminderJob } from './jobs/rider-health-cert-expiry-reminder.job';
import { RiderHeartbeatTimeoutOfflineJob } from './jobs/rider-heartbeat-timeout-offline.job';
import { RiderLocationArchiveJob } from './jobs/rider-location-archive.job';
import { RiderViolationDeductJob } from './jobs/rider-violation-deduct.job';
import { RiskExceptionScanJob } from './jobs/risk-exception-scan.job';
import { SmsCodeExpiredCleanupJob } from './jobs/sms-code-expired-cleanup.job';
import { SoldOutAutoOffShelfJob } from './jobs/sold-out-auto-off-shelf.job';
import { StockAlertScanJob } from './jobs/stock-alert-scan.job';
import { T1MerchantSettlementJob } from './jobs/t1-merchant-settlement.job';
import { ThirdPartyRetryJob } from './jobs/third-party-retry.job';
import { TrackCompressJob } from './jobs/track-compress.job';
import { WaitPayTimeoutCloseErrandJob } from './jobs/wait-pay-timeout-close-errand.job';
import { WaitPayTimeoutCloseJob } from './jobs/wait-pay-timeout-close.job';
import { WithdrawalStatusPollJob } from './jobs/withdrawal-status-poll.job';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthEntitiesModule,
    TypeOrmModule.forFeature([
      // Stage 0
      IdempotencyRecord,
      SysAuditLog,
      IntegrationRequestLog,
      SysConfig,
      // Stage 1
      SmsCode,
      LoginDevice,
      RealnameRecord,
      CustomerUser,
      CustomerAddress,
      // Stage 2
      MerchantLicense,
      Product,
      MerchantPromotion,
      // Stage 3
      RiderAccount,
      RiderApplication,
      RiderStatus,
      RiderLocation,
      RiderAuditLog,
      // Stage 4
      AccountDisableRecord,
      // Stage 5
      FoodOrder,
      PaymentOrder,
      StockLock,
      OrderTimeline,
      ProductSku,
      // Stage 6
      ErrandOrder,
      ErrandTask,
      ErrandTimeline,
      // Stage 7
      MerchantSettlement,
      MerchantStatisticsSnapshot,
      MerchantWithdrawal,
      OrderReview,
      Store,
      // Stage 8
      DispatchTask,
      RiderTask,
      RiderViolation,
      RiderEarning,
      TrackPoint,
      // Stage 9
      CouponRule,
      DashboardSnapshot,
      ExportTask,
      RefundOrder,
      RiskExceptionLog,
    ]),
    IntegrationGatewayModule,
    ErrandDispatchModule,
  ],
  controllers: [SchedulerController],
  providers: [
    DistributedLockService,
    // Stage 0
    ExpiredCleanupJob,
    AuditLogArchiveJob,
    ThirdPartyRetryJob,
    ConfigCacheRefreshJob,
    // Stage 1
    SmsCodeExpiredCleanupJob,
    LoginAnomalyDetectionJob,
    RealnameRetryJob,
    DefaultAddressUniquenessJob,
    // Stage 2
    LicenseExpiryReminderJob,
    StockAlertScanJob,
    PromoStartJob,
    PromoEndJob,
    SoldOutAutoOffShelfJob,
    // Stage 3
    RiderHeartbeatTimeoutOfflineJob,
    RiderHealthCertExpiryReminderJob,
    RiderAuditTimeoutReminderJob,
    RiderLocationArchiveJob,
    // Stage 4
    ConfigChangeAggregateJob,
    DisabledAccountTokenBroadcastJob,
    // Stage 5
    WaitPayTimeoutCloseJob,
    MerchantAcceptTimeoutCancelJob,
    PaymentCallbackRetryJob,
    ReservedOrderDispatchJob,
    // Stage 6
    WaitPayTimeoutCloseErrandJob,
    NoRiderPriceIncreaseJob,
    NoRiderCancelJob,
    ReservedErrandDispatchJob,
    // Stage 7
    MerchantAcceptRemindJob,
    T1MerchantSettlementJob,
    WithdrawalStatusPollJob,
    DailyStatisticsSnapshotJob,
    // Stage 8
    DispatchTimeoutRetryJob,
    TrackCompressJob,
    DeliveryTimeoutMarkJob,
    RiderEarningDailySettleJob,
    RiderViolationDeductJob,
    // Stage 9
    RiskExceptionScanJob,
    DashboardSnapshotGenerateJob,
    ExportTaskProcessJob,
    CouponExpireJob,
    MarketingActivityToggleJob,
    ReconciliationJob,
  ],
  exports: [ConfigCacheRefreshJob],
})
export class SchedulerModule {}
