import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandOrder, ErrandTask } from '../../database/entities';

import { ErrandDispatchService } from './errand-dispatch.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandOrder, ErrandTask])],
  providers: [ErrandDispatchService],
  exports: [ErrandDispatchService],
})
export class ErrandDispatchModule {}
