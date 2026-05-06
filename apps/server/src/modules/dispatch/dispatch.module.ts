import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DispatchTask, RiderStatus, SysConfig } from '../../database/entities';

import { DispatchService } from './dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([DispatchTask, RiderStatus, SysConfig])],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
