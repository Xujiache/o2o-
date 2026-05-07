import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, FoodOrderItem, MerchantOrderActionLog, OrderTimeline, Store } from '../../database/entities';

import { MerchantOrderController } from './merchant-order.controller';
import { MerchantOrderService } from './merchant-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, FoodOrderItem, MerchantOrderActionLog, OrderTimeline, Store])],
  controllers: [MerchantOrderController],
  providers: [MerchantOrderService],
  exports: [MerchantOrderService],
})
export class MerchantOrderModule {}
