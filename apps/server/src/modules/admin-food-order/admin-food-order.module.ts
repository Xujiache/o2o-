import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, OrderTimeline, PaymentOrder } from '../../database/entities';
import { ExportModule } from '../export/export.module';

import { AdminFoodOrderController } from './admin-food-order.controller';
import { AdminFoodOrderService } from './admin-food-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, OrderTimeline, PaymentOrder]), ExportModule],
  controllers: [AdminFoodOrderController],
  providers: [AdminFoodOrderService],
  exports: [AdminFoodOrderService],
})
export class AdminFoodOrderModule {}
