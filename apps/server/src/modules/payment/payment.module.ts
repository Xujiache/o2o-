import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ErrandOrder,
  ErrandTimeline,
  FoodOrder,
  OrderTimeline,
  PaymentOrder,
  ProductSku,
  StockLock,
  StockRecord,
} from '../../database/entities';
import { CouponModule } from '../coupon/coupon.module';

import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodOrder,
      PaymentOrder,
      ProductSku,
      StockLock,
      StockRecord,
      OrderTimeline,
      ErrandOrder,
      ErrandTimeline,
    ]),
    CouponModule,
  ],
  controllers: [PaymentController, PaymentCallbackController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
