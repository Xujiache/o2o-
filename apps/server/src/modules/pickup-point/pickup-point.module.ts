import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PickupPoint } from '../../database/entities';

import { AdminPickupPointController } from './admin-pickup-point.controller';
import { PickupPointController } from './pickup-point.controller';
import { PickupPointService } from './pickup-point.service';

@Module({
  imports: [TypeOrmModule.forFeature([PickupPoint])],
  controllers: [PickupPointController, AdminPickupPointController],
  providers: [PickupPointService],
  exports: [PickupPointService],
})
export class PickupPointModule {}
