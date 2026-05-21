import { forwardRef, Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AdminUser,
  DomainEvent,
  ErrandTimeline,
  IntegrationRequestLog,
  OrderTimeline,
  RiderEarning,
  RiderStatus,
  RiskUserTag,
  SysConfig,
} from '../database/entities';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';
import { CustomerAuthModule } from '../modules/customer-auth/customer-auth.module';
import { DispatchModule } from '../modules/dispatch/dispatch.module';
import { ErrandDispatchModule } from '../modules/errand-dispatch/errand-dispatch.module';
import { IntegrationGatewayModule } from '../modules/integration-gateway/integration-gateway.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

import { DomainEventBus } from './domain-event-bus';
import { DomainEventRetryJob } from './jobs/domain-event-retry.job';
import { AccountDisabledSubscriber } from './subscribers/account-disabled.subscriber';
import { AdminLoggedInSubscriber } from './subscribers/admin-logged-in.subscriber';
import { AfterSaleAppliedSubscriber } from './subscribers/after-sale-applied.subscriber';
import { AfterSaleReviewedByMerchantSubscriber } from './subscribers/after-sale-reviewed-by-merchant.subscriber';
import { ArbitrationCompletedSubscriber } from './subscribers/arbitration-completed.subscriber';
import { ConfigChangedSubscriber } from './subscribers/config-changed.subscriber';
import { CouponPublishedSubscriber } from './subscribers/coupon-published.subscriber';
import { CustomerAccountDisabledSubscriber } from './subscribers/customer-account-disabled.subscriber';
import { CustomerLoggedInSubscriber } from './subscribers/customer-logged-in.subscriber';
import { CustomerRealnameVerifiedSubscriber } from './subscribers/customer-realname-verified.subscriber';
import { CustomerRegisteredSubscriber } from './subscribers/customer-registered.subscriber';
import { DispatchStartedSubscriber } from './subscribers/dispatch-started.subscriber';
import { ErrandPaidSubscriber } from './subscribers/errand-paid.subscriber';
import { FileUploadedSubscriber } from './subscribers/file-uploaded.subscriber';
import { FoodReadyForPickupSubscriber } from './subscribers/food-ready-for-pickup.subscriber';
import { ManualDispatchCreatedSubscriber } from './subscribers/manual-dispatch-created.subscriber';
import { MerchantApprovedSubscriber } from './subscribers/merchant-approved.subscriber';
import { MerchantAuditedSubscriber } from './subscribers/merchant-audited.subscriber';
import { MerchantOrderAcceptedSubscriber } from './subscribers/merchant-order-accepted.subscriber';
import { MerchantOrderPushedSubscriber } from './subscribers/merchant-order-pushed.subscriber';
import { MerchantOrderRejectedSubscriber } from './subscribers/merchant-order-rejected.subscriber';
import { MerchantSettlementGeneratedSubscriber } from './subscribers/merchant-settlement-generated.subscriber';
import { MerchantSubmittedSubscriber } from './subscribers/merchant-submitted.subscriber';
import { MerchantWithdrawRequestedSubscriber } from './subscribers/merchant-withdraw-requested.subscriber';
import { OrderReassignedSubscriber } from './subscribers/order-reassigned.subscriber';
import { OrderReviewSubmittedSubscriber } from './subscribers/order-review-submitted.subscriber';
import { RateRuleChangedSubscriber } from './subscribers/rate-rule-changed.subscriber';
import { RefundExecutedSubscriber } from './subscribers/refund-executed.subscriber';
import { ReportGeneratedSubscriber } from './subscribers/report-generated.subscriber';
import { RiderApprovedSubscriber } from './subscribers/rider-approved.subscriber';
import { RiderArrivedPickupSubscriber } from './subscribers/rider-arrived-pickup.subscriber';
import { RiderAuditedSubscriber } from './subscribers/rider-audited.subscriber';
import { RiderDeliveredSubscriber } from './subscribers/rider-delivered.subscriber';
import { RiderEarningGeneratedSubscriber } from './subscribers/rider-earning-generated.subscriber';
import { RiderExceptionReportedSubscriber } from './subscribers/rider-exception-reported.subscriber';
import { RiderLocationUpdatedSubscriber } from './subscribers/rider-location-updated.subscriber';
import { RiderOfflineSubscriber } from './subscribers/rider-offline.subscriber';
import { RiderOnlineSubscriber } from './subscribers/rider-online.subscriber';
import { RiderPickedUpSubscriber } from './subscribers/rider-picked-up.subscriber';
import { RiderSubmittedSubscriber } from './subscribers/rider-submitted.subscriber';
import { RiderTaskAcceptedSubscriber } from './subscribers/rider-task-accepted.subscriber';
import { RoleChangedSubscriber } from './subscribers/role-changed.subscriber';
import { StockLowSubscriber } from './subscribers/stock-low.subscriber';
import { StoreStatusChangedSubscriber } from './subscribers/store-status-changed.subscriber';
import { ThirdPartyConfigChangedSubscriber } from './subscribers/third-party-config-changed.subscriber';
// Stage 8

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
    TypeOrmModule.forFeature([
      DomainEvent,
      RiskUserTag,
      RiderStatus,
      IntegrationRequestLog,
      AdminUser,
      RiderEarning,
      SysConfig,
      OrderTimeline,
      ErrandTimeline,
    ]),
    SchedulerModule,
    IntegrationGatewayModule,
    AuditLogModule,
    DispatchModule,
    ErrandDispatchModule,
    forwardRef(() => CustomerAuthModule),
  ],
  providers: [
    DomainEventBus,
    ConfigChangedSubscriber,
    FileUploadedSubscriber,
    DomainEventRetryJob,
    CustomerRegisteredSubscriber,
    CustomerLoggedInSubscriber,
    CustomerRealnameVerifiedSubscriber,
    CustomerAccountDisabledSubscriber,
    MerchantSubmittedSubscriber,
    MerchantApprovedSubscriber,
    StoreStatusChangedSubscriber,
    StockLowSubscriber,
    RiderSubmittedSubscriber,
    RiderApprovedSubscriber,
    RiderOnlineSubscriber,
    RiderOfflineSubscriber,
    RiderLocationUpdatedSubscriber,
    // Stage 4
    AdminLoggedInSubscriber,
    RoleChangedSubscriber,
    AccountDisabledSubscriber,
    MerchantAuditedSubscriber,
    RiderAuditedSubscriber,
    ThirdPartyConfigChangedSubscriber,
    // Stage 7
    MerchantOrderPushedSubscriber,
    MerchantOrderAcceptedSubscriber,
    MerchantOrderRejectedSubscriber,
    FoodReadyForPickupSubscriber,
    ErrandPaidSubscriber,
    AfterSaleAppliedSubscriber,
    AfterSaleReviewedByMerchantSubscriber,
    OrderReviewSubmittedSubscriber,
    MerchantSettlementGeneratedSubscriber,
    MerchantWithdrawRequestedSubscriber,
    // Stage 8
    DispatchStartedSubscriber,
    RiderTaskAcceptedSubscriber,
    RiderArrivedPickupSubscriber,
    RiderPickedUpSubscriber,
    RiderDeliveredSubscriber,
    RiderExceptionReportedSubscriber,
    RiderEarningGeneratedSubscriber,
    // Stage 9
    ManualDispatchCreatedSubscriber,
    OrderReassignedSubscriber,
    ArbitrationCompletedSubscriber,
    RefundExecutedSubscriber,
    CouponPublishedSubscriber,
    RateRuleChangedSubscriber,
    ReportGeneratedSubscriber,
  ],
  exports: [DomainEventBus],
})
export class EventsModule {}
