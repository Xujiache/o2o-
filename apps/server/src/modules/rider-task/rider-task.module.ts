import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DispatchTask, ErrandOrder, ErrandTask, FoodOrder, RiderTask, RiderViolation } from '../../database/entities';
import { DispatchModule } from '../dispatch/dispatch.module';

import { RiderTaskController } from './rider-task.controller';
import { RiderTaskService } from './rider-task.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderTask, DispatchTask, FoodOrder, ErrandOrder, ErrandTask, RiderViolation]),
    DispatchModule,
  ],
  controllers: [RiderTaskController],
  providers: [RiderTaskService],
  exports: [RiderTaskService],
})
export class RiderTaskModule {}
