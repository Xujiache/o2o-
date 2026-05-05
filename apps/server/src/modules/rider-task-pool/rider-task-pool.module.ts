import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  FoodOrder,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  Store,
} from '../../database/entities';

import { RiderTaskPoolController } from './rider-task-pool.controller';
import { RiderTaskPoolService } from './rider-task-pool.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderAccount, RiderApplication, RiderStatus, RiderServiceArea, FoodOrder, Store]),
  ],
  controllers: [RiderTaskPoolController],
  providers: [RiderTaskPoolService],
  exports: [RiderTaskPoolService],
})
export class RiderTaskPoolModule {}
