import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderAccount, RiderStatus, RiderVehicle } from '../../database/entities';

import { RiderProfileController } from './rider-profile.controller';
import { RiderProfileService } from './rider-profile.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderAccount, RiderStatus, RiderVehicle])],
  controllers: [RiderProfileController],
  providers: [RiderProfileService],
  exports: [RiderProfileService],
})
export class RiderProfileModule {}
