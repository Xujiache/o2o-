import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  FileObject,
  IntegrationRequestLog,
  RiderAccount,
  RiderApplication,
  RiderAuditLog,
  RiderCertificate,
  RiderVehicle,
} from '../../database/entities';

import { RiderOnboardingController } from './rider-onboarding.controller';
import { RiderOnboardingService } from './rider-onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiderAccount,
      RiderApplication,
      RiderCertificate,
      RiderVehicle,
      RiderAuditLog,
      FileObject,
      IntegrationRequestLog,
    ]),
  ],
  controllers: [RiderOnboardingController],
  providers: [RiderOnboardingService],
  exports: [RiderOnboardingService],
})
export class RiderOnboardingModule {}
