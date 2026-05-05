import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantWithdrawal } from '../../database/entities';

import { AdminWithdrawalController } from './admin-withdrawal.controller';
import { AdminWithdrawalService } from './admin-withdrawal.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantWithdrawal])],
  controllers: [AdminWithdrawalController],
  providers: [AdminWithdrawalService],
  exports: [AdminWithdrawalService],
})
export class AdminWithdrawalModule {}
