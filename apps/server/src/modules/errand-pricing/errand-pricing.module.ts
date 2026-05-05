import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandPricing } from '../../database/entities';

import { ErrandPricingService } from './errand-pricing.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandPricing])],
  providers: [ErrandPricingService],
  exports: [ErrandPricingService],
})
export class ErrandPricingModule {}
