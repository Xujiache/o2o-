import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderEarning } from '../../database/entities';

import { RiderEarningController } from './rider-earning.controller';
import { RiderEarningService } from './rider-earning.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderEarning])],
  controllers: [RiderEarningController],
  providers: [RiderEarningService],
  exports: [RiderEarningService],
})
export class RiderEarningModule {}
