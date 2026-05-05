import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantPromotion, Store } from '../../database/entities';

import { MerchantPromotionController } from './merchant-promotion.controller';
import { MerchantPromotionService } from './merchant-promotion.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantPromotion, Store])],
  controllers: [MerchantPromotionController],
  providers: [MerchantPromotionService],
  exports: [MerchantPromotionService],
})
export class MerchantPromotionModule {}
