import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CustomerAddress,
  FoodOrder,
  FoodOrderItem,
  OrderPriceSnapshot,
  OrderTimeline,
  Product,
  ProductSku,
  StockLock,
  Store,
} from '../../database/entities';
import { EventsModule } from '../../events/events.module';

import { FoodOrderController } from './food-order.controller';
import { FoodOrderService } from './food-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Store,
      CustomerAddress,
      Product,
      ProductSku,
      OrderPriceSnapshot,
      FoodOrder,
      FoodOrderItem,
      StockLock,
      OrderTimeline,
    ]),
    EventsModule,
  ],
  controllers: [FoodOrderController],
  providers: [FoodOrderService],
  exports: [FoodOrderService],
})
export class FoodOrderModule {}
