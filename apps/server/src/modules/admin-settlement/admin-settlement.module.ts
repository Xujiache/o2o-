import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantSettlement } from '../../database/entities';

import { AdminSettlementController } from './admin-settlement.controller';
import { AdminSettlementService } from './admin-settlement.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantSettlement])],
  controllers: [AdminSettlementController],
  providers: [AdminSettlementService],
  exports: [AdminSettlementService],
})
export class AdminSettlementModule {}
