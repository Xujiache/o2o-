import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AfterSale, AfterSaleEvidence, Store } from '../../database/entities';

import { MerchantAfterSaleController } from './merchant-after-sale.controller';
import { MerchantAfterSaleService } from './merchant-after-sale.service';

@Module({
  imports: [TypeOrmModule.forFeature([AfterSale, AfterSaleEvidence, Store])],
  controllers: [MerchantAfterSaleController],
  providers: [MerchantAfterSaleService],
  exports: [MerchantAfterSaleService],
})
export class MerchantAfterSaleModule {}
