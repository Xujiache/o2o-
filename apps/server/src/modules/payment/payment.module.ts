import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, OrderTimeline, PaymentOrder, ProductSku, StockLock, StockRecord } from '../../database/entities';

import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, PaymentOrder, ProductSku, StockLock, StockRecord, OrderTimeline])],
  controllers: [PaymentController, PaymentCallbackController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
