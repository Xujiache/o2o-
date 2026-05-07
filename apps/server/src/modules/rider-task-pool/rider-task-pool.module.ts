import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  DispatchTask,
  ErrandTask,
  FoodOrder,
  RiderAccount,
  RiderApplication,
  RiderServiceArea,
  RiderStatus,
  Store,
  SysConfig,
} from '../../database/entities';

import { RiderTaskPoolController } from './rider-task-pool.controller';
import { RiderTaskPoolService } from './rider-task-pool.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RiderAccount,
      RiderApplication,
      RiderStatus,
      RiderServiceArea,
      FoodOrder,
      Store,
      ErrandTask,
      DispatchTask,
      SysConfig,
    ]),
  ],
  controllers: [RiderTaskPoolController],
  providers: [RiderTaskPoolService],
  exports: [RiderTaskPoolService],
})
export class RiderTaskPoolModule {}
