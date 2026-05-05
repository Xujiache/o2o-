import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantStatisticsSnapshot, Store } from '../../database/entities';

import { MerchantStatisticsController } from './merchant-statistics.controller';
import { MerchantStatisticsService } from './merchant-statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantStatisticsSnapshot, Store])],
  controllers: [MerchantStatisticsController],
  providers: [MerchantStatisticsService],
  exports: [MerchantStatisticsService],
})
export class MerchantStatisticsModule {}
