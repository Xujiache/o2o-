import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  DispatchTask,
  ErrandOrder,
  ErrandTimeline,
  FoodOrder,
  ManualDispatchLog,
  OrderTimeline,
  PaymentOrder,
  SysAuditLog,
} from '../../database/entities';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FoodOrder,
      ErrandOrder,
      OrderTimeline,
      ErrandTimeline,
      SysAuditLog,
      DispatchTask,
      ManualDispatchLog,
      PaymentOrder,
    ]),
  ],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
