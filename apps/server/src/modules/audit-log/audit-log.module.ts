import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysAuditLog } from '../../database/entities';

import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogDetail, AuditLogDetailSchema } from './schemas/audit-log-detail.schema';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([SysAuditLog]),
    MongooseModule.forFeature([{ name: AuditLogDetail.name, schema: AuditLogDetailSchema }]),
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
