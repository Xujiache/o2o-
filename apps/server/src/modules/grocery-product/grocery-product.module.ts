import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { GroceryCategory, GroceryProduct, GroceryProductSku } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { AdminGroceryProductController } from './admin-grocery-product.controller';
import { GroceryProductController } from './grocery-product.controller';
import { GroceryProductService } from './grocery-product.service';

@Module({
  imports: [TypeOrmModule.forFeature([GroceryCategory, GroceryProduct, GroceryProductSku]), FileModule],
  controllers: [GroceryProductController, AdminGroceryProductController],
  providers: [GroceryProductService],
  exports: [GroceryProductService],
})
export class GroceryProductModule {}
