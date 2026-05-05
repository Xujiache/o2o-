import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  FileObject,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderCertificate,
  RiderServiceArea,
  RiderStatus,
  RiderVehicle,
} from '../../database/entities';

import { AdminRiderController } from './admin-rider.controller';
import { AdminRiderService } from './admin-rider.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiderAccount,
      RiderApplication,
      RiderCertificate,
      RiderVehicle,
      RiderStatus,
      RiderServiceArea,
      RiderAuditLog,
      FileObject,
    ]),
  ],
  controllers: [AdminRiderController],
  providers: [AdminRiderService],
  exports: [AdminRiderService],
})
export class AdminRiderModule {}
