import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product } from '../../database/entities';
import { AdminRefundModule } from '../admin-refund/admin-refund.module';

import { GroceryWeighController } from './grocery-weigh.controller';
import { GroceryWeighService } from './grocery-weigh.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GroceryOrder, GroceryOrderItem, PickupPoint, PickupTimeSlot, Product]),
    AdminRefundModule,
  ],
  controllers: [GroceryWeighController],
  providers: [GroceryWeighService],
  exports: [GroceryWeighService],
})
export class GroceryWeighModule {}
