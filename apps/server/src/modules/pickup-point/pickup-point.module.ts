import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PickupPoint, PickupTimeSlot } from '../../database/entities';

import { PickupPointCustomerController, PickupPointMerchantController } from './pickup-point.controller';
import { PickupPointService } from './pickup-point.service';

@Module({
  imports: [TypeOrmModule.forFeature([PickupPoint, PickupTimeSlot])],
  controllers: [PickupPointCustomerController, PickupPointMerchantController],
  providers: [PickupPointService],
  exports: [PickupPointService],
})
export class PickupPointModule {}
