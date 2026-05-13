import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryOrder, GroceryOrderItem, PickupPoint, PickupVerifyLog } from '../../database/entities';

import { PickupVerifyController } from './pickup-verify.controller';
import { PickupVerifyService } from './pickup-verify.service';

@Module({
  imports: [TypeOrmModule.forFeature([GroceryOrder, GroceryOrderItem, PickupPoint, PickupVerifyLog])],
  controllers: [PickupVerifyController],
  providers: [PickupVerifyService],
  exports: [PickupVerifyService],
})
export class PickupVerifyModule {}
