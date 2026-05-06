import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DispatchTask } from '../../database/entities';

import { AdminDispatchController } from './admin-dispatch.controller';
import { AdminDispatchService } from './admin-dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([DispatchTask])],
  controllers: [AdminDispatchController],
  providers: [AdminDispatchService],
  exports: [AdminDispatchService],
})
export class AdminDispatchModule {}
