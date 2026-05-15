import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QrcodeBatch, TraceabilityArchive, TraceabilityQrcode } from '../../database/entities';

import { AdminTraceabilityController } from './admin-traceability.controller';
import { TraceabilityPublicController } from './traceability.controller';
import { TraceabilityService } from './traceability.service';

@Module({
  imports: [TypeOrmModule.forFeature([TraceabilityArchive, TraceabilityQrcode, QrcodeBatch])],
  controllers: [TraceabilityPublicController, AdminTraceabilityController],
  providers: [TraceabilityService],
  exports: [TraceabilityService],
})
export class TraceabilityModule {}
