import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount, Product, Store, StoreBusinessHour } from '../../database/entities';

import { PublicStoreReadonlyController } from './public-store-readonly.controller';
import { PublicStoreReadonlyService } from './public-store-readonly.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StoreBusinessHour, Product, MerchantAccount])],
  controllers: [PublicStoreReadonlyController],
  providers: [PublicStoreReadonlyService],
  exports: [PublicStoreReadonlyService],
})
export class PublicStoreReadonlyModule {}
