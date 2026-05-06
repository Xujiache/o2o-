import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderAccount, RiderWithdrawal, SysConfig } from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { RiderWithdrawalController } from './rider-withdrawal.controller';
import { RiderWithdrawalService } from './rider-withdrawal.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderWithdrawal, RiderAccount, SysConfig]), SmsModule],
  controllers: [RiderWithdrawalController],
  providers: [RiderWithdrawalService],
  exports: [RiderWithdrawalService],
})
export class RiderWithdrawalModule {}
