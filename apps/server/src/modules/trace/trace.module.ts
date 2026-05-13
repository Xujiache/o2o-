import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product, TraceBatch, TraceQr, TraceRecord, TraceScanLog } from '../../database/entities';

import { TraceAdminController, TraceCustomerController } from './trace.controller';
import { TraceService } from './trace.service';

@Module({
  imports: [TypeOrmModule.forFeature([TraceBatch, TraceQr, TraceRecord, TraceScanLog, Product])],
  controllers: [TraceAdminController, TraceCustomerController],
  providers: [TraceService],
  exports: [TraceService],
})
export class TraceModule {}
