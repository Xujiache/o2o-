import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount, Store, StoreBusinessHour, StoreDeliveryArea } from '../../database/entities';

import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StoreBusinessHour, StoreDeliveryArea, MerchantAccount])],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
