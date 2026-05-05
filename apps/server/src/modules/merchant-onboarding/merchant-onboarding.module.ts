import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  FileObject,
  IntegrationRequestLog,
  MerchantAccount,
  MerchantApplication,
  MerchantLicense,
} from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { MerchantOnboardingController } from './merchant-onboarding.controller';
import { MerchantOnboardingService } from './merchant-onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MerchantAccount,
      MerchantApplication,
      MerchantLicense,
      FileObject,
      IntegrationRequestLog,
    ]),
    SmsModule,
  ],
  controllers: [MerchantOnboardingController],
  providers: [MerchantOnboardingService],
  exports: [MerchantOnboardingService],
})
export class MerchantOnboardingModule {}
