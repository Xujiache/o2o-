import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AfterSale, AfterSaleEvidence, FoodOrder, Store, SysConfig } from '../../database/entities';

import { CustomerAfterSaleController } from './customer-after-sale.controller';
import { CustomerAfterSaleService } from './customer-after-sale.service';

@Module({
  imports: [TypeOrmModule.forFeature([AfterSale, AfterSaleEvidence, FoodOrder, Store, SysConfig])],
  controllers: [CustomerAfterSaleController],
  providers: [CustomerAfterSaleService],
  exports: [CustomerAfterSaleService],
})
export class CustomerAfterSaleModule {}
