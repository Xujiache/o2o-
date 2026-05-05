import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantPromotion, Product, ProductCategory, ProductSku, Store } from '../../database/entities';

import { ProductQueryController } from './product-query.controller';
import { ProductQueryService } from './product-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store, Product, ProductSku, ProductCategory, MerchantPromotion])],
  controllers: [ProductQueryController],
  providers: [ProductQueryService],
  exports: [ProductQueryService],
})
export class ProductQueryModule {}
