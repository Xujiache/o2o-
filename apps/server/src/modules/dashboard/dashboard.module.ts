import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardSnapshot, ErrandOrder, FoodOrder, RiderStatus, RiskExceptionLog } from '../../database/entities';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardSnapshot, FoodOrder, ErrandOrder, RiderStatus, RiskExceptionLog])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
