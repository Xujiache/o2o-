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
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminCategoryModule } from './modules/admin-category/admin-category.module';
import { AdminCityModule } from './modules/admin-city/admin-city.module';
import { AdminMerchantModule } from './modules/admin-merchant/admin-merchant.module';
import { AdminRiderModule } from './modules/admin-rider/admin-rider.module';
import { AdminRolePermissionModule } from './modules/admin-role-permission/admin-role-permission.module';
import { AdminSystemConfigModule } from './modules/admin-system-config/admin-system-config.module';
import { AdminThirdPartyConfigModule } from './modules/admin-third-party-config/admin-third-party-config.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CommonConfigModule } from './modules/common-config/common-config.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { DictModule } from './modules/dict/dict.module';
import { FileModule } from './modules/file/file.module';
import { FoodHomeModule } from './modules/food-home/food-home.module';
import { FoodOrderModule } from './modules/food-order/food-order.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { IntegrationGatewayModule } from './modules/integration-gateway/integration-gateway.module';
import { MerchantAuthModule } from './modules/merchant-auth/merchant-auth.module';
import { MerchantOnboardingModule } from './modules/merchant-onboarding/merchant-onboarding.module';
import { MerchantPromotionModule } from './modules/merchant-promotion/merchant-promotion.module';
import { MessageSettingModule } from './modules/message-setting/message-setting.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProductModule } from './modules/product/product.module';
import { ProductQueryModule } from './modules/product-query/product-query.module';
import { PublicStoreReadonlyModule } from './modules/public-store-readonly/public-store-readonly.module';
import { RealnameModule } from './modules/realname/realname.module';
import { RiderAuthModule } from './modules/rider-auth/rider-auth.module';
import { RiderLocationModule } from './modules/rider-location/rider-location.module';
import { RiderOnboardingModule } from './modules/rider-onboarding/rider-onboarding.module';
import { RiderProfileModule } from './modules/rider-profile/rider-profile.module';
import { RiderTaskPoolModule } from './modules/rider-task-pool/rider-task-pool.module';
import { RiskModule } from './modules/risk/risk.module';
import { SmsModule } from './modules/sms/sms.module';
import { StockModule } from './modules/stock/stock.module';
import { StoreModule } from './modules/store/store.module';
import { StoreQueryModule } from './modules/store-query/store-query.module';
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
    MerchantAuthModule,
    MerchantOnboardingModule,
    StoreModule,
    ProductModule,
    StockModule,
    MerchantPromotionModule,
    AdminMerchantModule,
    PublicStoreReadonlyModule,
    RiderAuthModule,
    RiderOnboardingModule,
    RiderProfileModule,
    RiderLocationModule,
    RiderTaskPoolModule,
    AdminRiderModule,
    AdminAuthModule,
    AdminCityModule,
    AdminCategoryModule,
    AdminSystemConfigModule,
    AdminThirdPartyConfigModule,
    AdminRolePermissionModule,
    // Stage 5 — 用户端外卖交易闭环
    FoodHomeModule,
    StoreQueryModule,
    ProductQueryModule,
    CartModule,
    FoodOrderModule,
    PaymentModule,
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
