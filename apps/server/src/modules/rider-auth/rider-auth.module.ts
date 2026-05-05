import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderAccount, RiderApplication } from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { RiderAuthController } from './rider-auth.controller';
import { RiderAuthService } from './rider-auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderAccount, RiderApplication]), SmsModule],
  controllers: [RiderAuthController],
  providers: [RiderAuthService],
  exports: [RiderAuthService],
})
export class RiderAuthModule {}
