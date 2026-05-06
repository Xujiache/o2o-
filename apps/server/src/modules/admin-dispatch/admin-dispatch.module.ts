import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DispatchTask, ManualDispatchLog } from '../../database/entities';

import { AdminDispatchController } from './admin-dispatch.controller';
import { AdminDispatchService } from './admin-dispatch.service';
import { ManualDispatchController } from './manual-dispatch.controller';
import { ManualDispatchService } from './manual-dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([DispatchTask, ManualDispatchLog])],
  controllers: [AdminDispatchController, ManualDispatchController],
  providers: [AdminDispatchService, ManualDispatchService],
  exports: [AdminDispatchService, ManualDispatchService],
})
export class AdminDispatchModule {}
