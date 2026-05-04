import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DomainEvent } from '../database/entities';
import { SchedulerModule } from '../scheduler/scheduler.module';

import { DomainEventBus } from './domain-event-bus';
import { DomainEventRetryJob } from './jobs/domain-event-retry.job';
import { ConfigChangedSubscriber } from './subscribers/config-changed.subscriber';
import { FileUploadedSubscriber } from './subscribers/file-uploaded.subscriber';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
    TypeOrmModule.forFeature([DomainEvent]),
    SchedulerModule,
  ],
  providers: [DomainEventBus, ConfigChangedSubscriber, FileUploadedSubscriber, DomainEventRetryJob],
  exports: [DomainEventBus],
})
export class EventsModule {}
