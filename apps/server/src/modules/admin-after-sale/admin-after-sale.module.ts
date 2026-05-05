import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AfterSale, AfterSaleEvidence } from '../../database/entities';

import { AdminAfterSaleController } from './admin-after-sale.controller';
import { AdminAfterSaleService } from './admin-after-sale.service';

@Module({
  imports: [TypeOrmModule.forFeature([AfterSale, AfterSaleEvidence])],
  controllers: [AdminAfterSaleController],
  providers: [AdminAfterSaleService],
  exports: [AdminAfterSaleService],
})
export class AdminAfterSaleModule {}
