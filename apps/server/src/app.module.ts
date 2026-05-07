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
import { AdminAfterSaleModule } from './modules/admin-after-sale/admin-after-sale.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminCategoryModule } from './modules/admin-category/admin-category.module';
import { AdminCityModule } from './modules/admin-city/admin-city.module';
import { AdminDispatchModule } from './modules/admin-dispatch/admin-dispatch.module';
import { AdminErrandOrderModule } from './modules/admin-errand-order/admin-errand-order.module';
import { AdminFoodOrderModule } from './modules/admin-food-order/admin-food-order.module';
import { AdminMerchantModule } from './modules/admin-merchant/admin-merchant.module';
import { AdminMerchantStatisticsModule } from './modules/admin-merchant-statistics/admin-merchant-statistics.module';
import { AdminOrdersModule } from './modules/admin-orders/admin-orders.module';
import { AdminPaymentModule } from './modules/admin-payment/admin-payment.module';
import { AdminRefundModule } from './modules/admin-refund/admin-refund.module';
import { AdminRiderModule } from './modules/admin-rider/admin-rider.module';
import { AdminRolePermissionModule } from './modules/admin-role-permission/admin-role-permission.module';
import { AdminSettlementModule } from './modules/admin-settlement/admin-settlement.module';
import { AdminSystemConfigModule } from './modules/admin-system-config/admin-system-config.module';
import { AdminThirdPartyConfigModule } from './modules/admin-third-party-config/admin-third-party-config.module';
import { AdminTrackReplayModule } from './modules/admin-track-replay/admin-track-replay.module';
import { AdminUserModule } from './modules/admin-user/admin-user.module';
import { AdminViolationsModule } from './modules/admin-violations/admin-violations.module';
import { AdminWithdrawalModule } from './modules/admin-withdrawal/admin-withdrawal.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { CommonConfigModule } from './modules/common-config/common-config.module';
import { CouponModule } from './modules/coupon/coupon.module';
import { CustomerAfterSaleModule } from './modules/customer-after-sale/customer-after-sale.module';
import { CustomerAuthModule } from './modules/customer-auth/customer-auth.module';
import { CustomerOrdersModule } from './modules/customer-orders/customer-orders.module';
import { CustomerReviewModule } from './modules/customer-review/customer-review.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DictModule } from './modules/dict/dict.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { ErrandDispatchModule } from './modules/errand-dispatch/errand-dispatch.module';
import { ErrandOrderModule } from './modules/errand-order/errand-order.module';
import { ErrandPricingModule } from './modules/errand-pricing/errand-pricing.module';
import { ErrandTypeModule } from './modules/errand-type/errand-type.module';
import { ExportModule } from './modules/export/export.module';
import { FileModule } from './modules/file/file.module';
import { FinanceModule } from './modules/finance/finance.module';
import { FoodHomeModule } from './modules/food-home/food-home.module';
import { FoodOrderModule } from './modules/food-order/food-order.module';
import { GatewayModule } from './modules/gateway/gateway.module';
import { IntegrationGatewayModule } from './modules/integration-gateway/integration-gateway.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { MerchantAfterSaleModule } from './modules/merchant-after-sale/merchant-after-sale.module';
import { MerchantAuthModule } from './modules/merchant-auth/merchant-auth.module';
import { MerchantOnboardingModule } from './modules/merchant-onboarding/merchant-onboarding.module';
import { MerchantOrderModule } from './modules/merchant-order/merchant-order.module';
import { MerchantPromotionModule } from './modules/merchant-promotion/merchant-promotion.module';
import { MerchantReviewModule } from './modules/merchant-review/merchant-review.module';
import { MerchantSettlementModule } from './modules/merchant-settlement/merchant-settlement.module';
import { MerchantStatisticsModule } from './modules/merchant-statistics/merchant-statistics.module';
import { MerchantWithdrawalModule } from './modules/merchant-withdrawal/merchant-withdrawal.module';
import { MessageSettingModule } from './modules/message-setting/message-setting.module';
import { PaymentModule } from './modules/payment/payment.module';
import { PointsModule } from './modules/points/points.module';
import { ProductModule } from './modules/product/product.module';
import { ProductQueryModule } from './modules/product-query/product-query.module';
import { ProhibitedItemModule } from './modules/prohibited-item/prohibited-item.module';
import { PublicStoreReadonlyModule } from './modules/public-store-readonly/public-store-readonly.module';
import { PushDeviceModule } from './modules/push-device/push-device.module';
import { RealnameModule } from './modules/realname/realname.module';
import { RiderAssessmentModule } from './modules/rider-assessment/rider-assessment.module';
import { RiderAuthModule } from './modules/rider-auth/rider-auth.module';
import { RiderEarningModule } from './modules/rider-earning/rider-earning.module';
import { RiderLocationModule } from './modules/rider-location/rider-location.module';
import { RiderOnboardingModule } from './modules/rider-onboarding/rider-onboarding.module';
import { RiderProfileModule } from './modules/rider-profile/rider-profile.module';
import { RiderTaskModule } from './modules/rider-task/rider-task.module';
import { RiderTaskPoolModule } from './modules/rider-task-pool/rider-task-pool.module';
import { RiderWithdrawalModule } from './modules/rider-withdrawal/rider-withdrawal.module';
import { RiskModule } from './modules/risk/risk.module';
import { SmsModule } from './modules/sms/sms.module';
import { StockModule } from './modules/stock/stock.module';
import { StoreModule } from './modules/store/store.module';
import { StoreQueryModule } from './modules/store-query/store-query.module';
import { SystemModule } from './modules/system/system.module';
import { TrackModule } from './modules/track/track.module';
import { TrackQueryModule } from './modules/track-query/track-query.module';
import { UserProfileModule } from './modules/user-profile/user-profile.module';
import { ViolationModule } from './modules/violation/violation.module';
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
    CouponModule,
    TrackQueryModule,
    AdminFoodOrderModule,
    // Stage 6 — 用户端跑腿交易闭环
    ErrandTypeModule,
    ProhibitedItemModule,
    ErrandPricingModule,
    ErrandOrderModule,
    ErrandDispatchModule,
    AdminErrandOrderModule,
    // Stage 7 — 商家端 APP 订单售后结算
    MerchantOrderModule,
    MerchantAfterSaleModule,
    MerchantReviewModule,
    MerchantStatisticsModule,
    MerchantSettlementModule,
    MerchantWithdrawalModule,
    CustomerAfterSaleModule,
    CustomerReviewModule,
    AdminAfterSaleModule,
    AdminSettlementModule,
    AdminWithdrawalModule,
    AdminMerchantStatisticsModule,
    // Stage 8 — 骑手端调度轨迹收益考核
    DispatchModule,
    RiderTaskModule,
    TrackModule,
    RiderEarningModule,
    RiderWithdrawalModule,
    RiderAssessmentModule,
    ViolationModule,
    AdminDispatchModule,
    AdminTrackReplayModule,
    AdminViolationsModule,
    AdminRefundModule,
    MarketingModule,
    FinanceModule,
    DashboardModule,
    ExportModule,
    // Stage 10 — 四端联调:timeline / payment 查询 / push device
    CustomerOrdersModule,
    AdminOrdersModule,
    AdminPaymentModule,
    PushDeviceModule,
    PointsModule,
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
