import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product, Store } from '../../database/entities';

import { GroceryProductCustomerController, GroceryProductMerchantController } from './grocery-product.controller';
import { GroceryProductService } from './grocery-product.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Store])],
  controllers: [GroceryProductCustomerController, GroceryProductMerchantController],
  providers: [GroceryProductService],
  exports: [GroceryProductService],
})
export class GroceryProductModule {}
