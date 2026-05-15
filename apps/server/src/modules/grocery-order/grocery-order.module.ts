import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  GroceryOrder,
  GroceryOrderItem,
  GroceryProduct,
  GroceryProductSku,
  PaymentOrder,
  PickupPoint,
} from '../../database/entities';
import { AdminRefundModule } from '../admin-refund/admin-refund.module';

import { GroceryOrderController } from './grocery-order.controller';
import { GroceryOrderService } from './grocery-order.service';
import { MGroceryOrderController } from './m-grocery-order.controller';
import { PickingService } from './picking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroceryOrder,
      GroceryOrderItem,
      GroceryProduct,
      GroceryProductSku,
      PickupPoint,
      PaymentOrder,
    ]),
    AdminRefundModule,
  ],
  controllers: [GroceryOrderController, MGroceryOrderController],
  providers: [GroceryOrderService, PickingService],
  exports: [GroceryOrderService, PickingService],
})
export class GroceryOrderModule {}
