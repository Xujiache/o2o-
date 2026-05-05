import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantSettlement, Store } from '../../database/entities';

import { MerchantSettlementController } from './merchant-settlement.controller';
import { MerchantSettlementService } from './merchant-settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantSettlement, Store])],
  controllers: [MerchantSettlementController],
  providers: [MerchantSettlementService],
  exports: [MerchantSettlementService],
})
export class MerchantSettlementModule {}
