import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CouponLock, CouponRule, UserCoupon } from '../../database/entities';

import { CouponCustomerController } from './coupon-customer.controller';
import { CouponCustomerService } from './coupon-customer.service';
import { CouponService } from './coupon.service';

@Module({
  imports: [TypeOrmModule.forFeature([CouponLock, CouponRule, UserCoupon])],
  controllers: [CouponCustomerController],
  providers: [CouponService, CouponCustomerService],
  exports: [CouponService, CouponCustomerService],
})
export class CouponModule {}
