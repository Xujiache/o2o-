import { forwardRef, Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainEvent, IntegrationRequestLog, RiderStatus, RiskUserTag } from '../database/entities';
import { CustomerAuthModule } from '../modules/customer-auth/customer-auth.module';
import { IntegrationGatewayModule } from '../modules/integration-gateway/integration-gateway.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

import { DomainEventBus } from './domain-event-bus';
import { DomainEventRetryJob } from './jobs/domain-event-retry.job';
import { ConfigChangedSubscriber } from './subscribers/config-changed.subscriber';
import { CustomerAccountDisabledSubscriber } from './subscribers/customer-account-disabled.subscriber';
import { CustomerLoggedInSubscriber } from './subscribers/customer-logged-in.subscriber';
import { CustomerRealnameVerifiedSubscriber } from './subscribers/customer-realname-verified.subscriber';
import { CustomerRegisteredSubscriber } from './subscribers/customer-registered.subscriber';
import { FileUploadedSubscriber } from './subscribers/file-uploaded.subscriber';
import { MerchantApprovedSubscriber } from './subscribers/merchant-approved.subscriber';
import { MerchantSubmittedSubscriber } from './subscribers/merchant-submitted.subscriber';
import { RiderApprovedSubscriber } from './subscribers/rider-approved.subscriber';
import { RiderLocationUpdatedSubscriber } from './subscribers/rider-location-updated.subscriber';
import { RiderOfflineSubscriber } from './subscribers/rider-offline.subscriber';
import { RiderOnlineSubscriber } from './subscribers/rider-online.subscriber';
import { RiderSubmittedSubscriber } from './subscribers/rider-submitted.subscriber';
import { StockLowSubscriber } from './subscribers/stock-low.subscriber';
import { StoreStatusChangedSubscriber } from './subscribers/store-status-changed.subscriber';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
    TypeOrmModule.forFeature([DomainEvent, RiskUserTag, RiderStatus, IntegrationRequestLog]),
    SchedulerModule,
    IntegrationGatewayModule,
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
  ],
  exports: [DomainEventBus],
})
export class EventsModule {}
