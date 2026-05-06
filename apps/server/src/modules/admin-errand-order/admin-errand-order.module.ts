import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandOrder, ErrandOrderDetail, ErrandTask, ErrandTimeline } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { ExportModule } from '../export/export.module';

import { AdminErrandOrderController } from './admin-errand-order.controller';
import { AdminErrandOrderService } from './admin-errand-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ErrandOrder, ErrandOrderDetail, ErrandTimeline, ErrandTask]),
    AuthModule,
    ExportModule,
  ],
  controllers: [AdminErrandOrderController],
  providers: [AdminErrandOrderService],
  exports: [AdminErrandOrderService],
})
export class AdminErrandOrderModule {}
