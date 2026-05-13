import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount, Product, Store, StoreBusinessHour } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { PublicStoreReadonlyController } from './public-store-readonly.controller';
import { PublicStoreReadonlyService } from './public-store-readonly.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StoreBusinessHour, Product, MerchantAccount]), FileModule],
  controllers: [PublicStoreReadonlyController],
  providers: [PublicStoreReadonlyService],
  exports: [PublicStoreReadonlyService],
})
export class PublicStoreReadonlyModule {}
