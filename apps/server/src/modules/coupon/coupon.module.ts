import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CouponLock } from '../../database/entities';

import { CouponService } from './coupon.service';

@Module({
  imports: [TypeOrmModule.forFeature([CouponLock])],
  providers: [CouponService],
  exports: [CouponService],
})
export class CouponModule {}
