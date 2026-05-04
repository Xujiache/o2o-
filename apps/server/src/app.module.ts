import { resolve } from 'node:path';

import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import { LoggerModule } from 'nestjs-pino';

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { buildPinoOptions } from './common/logger/pino.config';
import { TraceIdMiddleware } from './common/middleware/trace-id.middleware';
import configuration from './config/configuration';
import { DatabaseModule } from './config/database.module';
import { MongooseModule } from './config/mongoose.module';
import { REDIS_CLIENT, RedisModule } from './config/redis.module';
import { IdempotencyRecord } from './database/entities';
import { EventsModule } from './events/events.module';
import { AddressModule } from './modules/address/address.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommonConfigModule } from './modules/common-config/common-config.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { DictModule } from './modules/dict/dict.module';
import { FileModule } from './modules/file/file.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { IntegrationGatewayModule } from './modules/integration-gateway/integration-gateway.module';
import { MessageSettingModule } from './modules/message-setting/message-setting.module';
import { RealnameModule } from './modules/realname/realname.module';
import { RiskModule } from './modules/risk/risk.module';
import { SmsModule } from './modules/sms/sms.module';
import { SystemModule } from './modules/system/system.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { SchedulerModule } from './scheduler/scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      envFilePath: ['.env', resolve(__dirname, '../../../.env'), resolve(__dirname, '../../../../.env')],
    }),
    LoggerModule.forRootAsync({
      useFactory: () => buildPinoOptions(),
    }),
    RedisModule,
    DatabaseModule,
    MongooseModule,
    TypeOrmModule.forFeature([IdempotencyRecord]),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService, REDIS_CLIENT],
      useFactory: (config: ConfigService, redis: Redis) => {
        const t = config.get<{ ttl: number; limit: number }>('throttle');
        return {
          throttlers: [{ ttl: (t?.ttl ?? 60) * 1000, limit: t?.limit ?? 60 }],
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
    }),
    AuthModule,
    AuditLogModule,
    GatewayModule,
    CommonConfigModule,
    DictModule,
    FileModule,
    IntegrationGatewayModule,
    SystemModule,
    RiskModule,
    SchedulerModule,
    EventsModule,
    SmsModule,
    UserProfileModule,
    MessageSettingModule,
    CustomerAuthModule,
    AddressModule,
    RealnameModule,
    AdminUserModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
