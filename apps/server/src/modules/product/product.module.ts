import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileObject, MerchantPromotion, Product, ProductCategory, ProductSku, Store } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { ProductController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, ProductCategory, Product, ProductSku, MerchantPromotion, FileObject]),
    FileModule,
  ],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
