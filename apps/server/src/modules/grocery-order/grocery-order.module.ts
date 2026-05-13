import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product, Store } from '../../database/entities';

import { GroceryOrderCustomerController } from './grocery-order.controller';
import { GroceryOrderService } from './grocery-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product, Store])],
  controllers: [GroceryOrderCustomerController],
  providers: [GroceryOrderService],
  exports: [GroceryOrderService],
})
export class GroceryOrderModule {}
