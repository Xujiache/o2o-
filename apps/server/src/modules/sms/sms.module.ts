import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IntegrationRequestLog, SmsCode } from '../../database/entities';

import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [TypeOrmModule.forFeature([SmsCode, IntegrationRequestLog])],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
