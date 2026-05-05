import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, OrderTimeline, PaymentOrder } from '../../database/entities';

import { AdminFoodOrderController } from './admin-food-order.controller';
import { AdminFoodOrderService } from './admin-food-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, OrderTimeline, PaymentOrder])],
  controllers: [AdminFoodOrderController],
  providers: [AdminFoodOrderService],
  exports: [AdminFoodOrderService],
})
export class AdminFoodOrderModule {}
