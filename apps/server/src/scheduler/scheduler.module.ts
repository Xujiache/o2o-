import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdempotencyRecord, IntegrationRequestLog, SysAuditLog, SysConfig } from '../database/entities';
import { AuthEntitiesModule } from '../modules/auth/auth-entities.module';

import { DistributedLockService } from './distributed-lock.service';
import { AuditLogArchiveJob } from './jobs/audit-log-archive.job';
import { ConfigCacheRefreshJob } from './jobs/config-cache-refresh.job';
import { ExpiredCleanupJob } from './jobs/expired-cleanup.job';
import { ThirdPartyRetryJob } from './jobs/third-party-retry.job';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthEntitiesModule,
    TypeOrmModule.forFeature([IdempotencyRecord, SysAuditLog, IntegrationRequestLog, SysConfig]),
  ],
  controllers: [SchedulerController],
  providers: [DistributedLockService, ExpiredCleanupJob, AuditLogArchiveJob, ThirdPartyRetryJob, ConfigCacheRefreshJob],
  exports: [ConfigCacheRefreshJob],
})
export class SchedulerModule {}
