import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerUser, IntegrationRequestLog, RealnameRecord } from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { RealnameController } from './realname.controller';
import { RealnameService } from './realname.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerUser, RealnameRecord, IntegrationRequestLog]), SmsModule],
  controllers: [RealnameController],
  providers: [RealnameService],
  exports: [RealnameService],
})
export class RealnameModule {}
