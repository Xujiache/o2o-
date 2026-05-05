import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MerchantStatisticsSnapshot } from '../../database/entities';

import { AdminMerchantStatisticsController } from './admin-merchant-statistics.controller';
import { AdminMerchantStatisticsService } from './admin-merchant-statistics.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantStatisticsSnapshot])],
  controllers: [AdminMerchantStatisticsController],
  providers: [AdminMerchantStatisticsService],
  exports: [AdminMerchantStatisticsService],
})
export class AdminMerchantStatisticsModule {}
