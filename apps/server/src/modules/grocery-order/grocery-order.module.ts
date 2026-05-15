import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryOrder, GroceryOrderItem, GroceryProduct, PickupPoint } from '../../database/entities';

import { GroceryOrderController } from './grocery-order.controller';
import { GroceryOrderService } from './grocery-order.service';
import { MGroceryOrderController } from './m-grocery-order.controller';
import { PickingService } from './picking.service';

@Module({
  imports: [TypeOrmModule.forFeature([GroceryOrder, GroceryOrderItem, GroceryProduct, PickupPoint])],
  controllers: [GroceryOrderController, MGroceryOrderController],
  providers: [GroceryOrderService, PickingService],
  exports: [GroceryOrderService, PickingService],
})
export class GroceryOrderModule {}
