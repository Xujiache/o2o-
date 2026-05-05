import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileObject, MerchantAccount, MerchantApplication, MerchantLicense, Store } from '../../database/entities';
import { StoreModule } from '../store/store.module';

import { AdminMerchantController } from './admin-merchant.controller';
import { AdminMerchantService } from './admin-merchant.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MerchantApplication, MerchantAccount, MerchantLicense, FileObject, Store]),
    StoreModule,
  ],
  controllers: [AdminMerchantController],
  providers: [AdminMerchantService],
  exports: [AdminMerchantService],
})
export class AdminMerchantModule {}
