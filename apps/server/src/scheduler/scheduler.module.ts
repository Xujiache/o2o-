import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CustomerAddress,
  CustomerUser,
  IdempotencyRecord,
  IntegrationRequestLog,
  LoginDevice,
  MerchantLicense,
  MerchantPromotion,
  Product,
  RealnameRecord,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderLocation,
  RiderStatus,
  SmsCode,
  SysAuditLog,
  SysConfig,
} from '../database/entities';
import { AuthEntitiesModule } from '../modules/auth/auth-entities.module';

import { DistributedLockService } from './distributed-lock.service';
import { AuditLogArchiveJob } from './jobs/audit-log-archive.job';
import { ConfigCacheRefreshJob } from './jobs/config-cache-refresh.job';
import { DefaultAddressUniquenessJob } from './jobs/default-address-uniqueness.job';
import { ExpiredCleanupJob } from './jobs/expired-cleanup.job';
import { LicenseExpiryReminderJob } from './jobs/license-expiry-reminder.job';
import { LoginAnomalyDetectionJob } from './jobs/login-anomaly-detection.job';
import { PromoEndJob } from './jobs/promo-end.job';
import { PromoStartJob } from './jobs/promo-start.job';
import { RealnameRetryJob } from './jobs/realname-retry.job';
import { RiderAuditTimeoutReminderJob } from './jobs/rider-audit-timeout-reminder.job';
import { RiderHealthCertExpiryReminderJob } from './jobs/rider-health-cert-expiry-reminder.job';
import { RiderHeartbeatTimeoutOfflineJob } from './jobs/rider-heartbeat-timeout-offline.job';
import { RiderLocationArchiveJob } from './jobs/rider-location-archive.job';
import { SmsCodeExpiredCleanupJob } from './jobs/sms-code-expired-cleanup.job';
import { SoldOutAutoOffShelfJob } from './jobs/sold-out-auto-off-shelf.job';
import { StockAlertScanJob } from './jobs/stock-alert-scan.job';
import { ThirdPartyRetryJob } from './jobs/third-party-retry.job';
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
    ]),
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
  ],
  exports: [ConfigCacheRefreshJob],
})
export class SchedulerModule {}
