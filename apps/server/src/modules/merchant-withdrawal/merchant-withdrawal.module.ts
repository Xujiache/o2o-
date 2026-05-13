import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount, MerchantSettlement, MerchantWithdrawal, Store, SysConfig } from '../../database/entities';
import { SmsModule } from '../sms/sms.module';

import { MerchantWithdrawalController } from './merchant-withdrawal.controller';
import { MerchantWithdrawalService } from './merchant-withdrawal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantWithdrawal, MerchantAccount, MerchantSettlement, Store, SysConfig]),
    SmsModule,
  ],
  controllers: [MerchantWithdrawalController],
  providers: [MerchantWithdrawalService],
  exports: [MerchantWithdrawalService],
})
export class MerchantWithdrawalModule {}
