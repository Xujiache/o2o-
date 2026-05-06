import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AfterSale, AfterSaleArbitration, AfterSaleEvidence } from '../../database/entities';
import { AdminRefundModule } from '../admin-refund/admin-refund.module';

import { AdminAfterSaleController } from './admin-after-sale.controller';
import { AdminAfterSaleService } from './admin-after-sale.service';
import { ArbitrateController } from './arbitrate.controller';
import { ArbitrateService } from './arbitrate.service';

@Module({
  imports: [TypeOrmModule.forFeature([AfterSale, AfterSaleEvidence, AfterSaleArbitration]), AdminRefundModule],
  controllers: [AdminAfterSaleController, ArbitrateController],
  providers: [AdminAfterSaleService, ArbitrateService],
  exports: [AdminAfterSaleService, ArbitrateService],
})
export class AdminAfterSaleModule {}
