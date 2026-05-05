import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderAccount, RiderApplication, RiderServiceArea, RiderStatus } from '../../database/entities';

import { RiderTaskPoolController } from './rider-task-pool.controller';
import { RiderTaskPoolService } from './rider-task-pool.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderAccount, RiderApplication, RiderStatus, RiderServiceArea])],
  controllers: [RiderTaskPoolController],
  providers: [RiderTaskPoolService],
  exports: [RiderTaskPoolService],
})
export class RiderTaskPoolModule {}
