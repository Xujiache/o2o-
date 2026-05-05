import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderLocation,
  RiderStatus,
} from '../../database/entities';

import { RiderLocationController } from './rider-location.controller';
import { RiderLocationService } from './rider-location.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiderAccount,
      RiderApplication,
      RiderStatus,
      RiderLocation,
      RiderAuditLog,
      IntegrationRequestLog,
    ]),
  ],
  controllers: [RiderLocationController],
  providers: [RiderLocationService],
  exports: [RiderLocationService],
})
export class RiderLocationModule {}
