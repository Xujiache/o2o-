import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantAccount, Store, StoreBusinessHour, StoreDeliveryArea } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [TypeOrmModule.forFeature([Store, StoreBusinessHour, StoreDeliveryArea, MerchantAccount]), FileModule],
  controllers: [StoreController],
  providers: [StoreService],
  exports: [StoreService],
})
export class StoreModule {}
