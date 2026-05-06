import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderViolation } from '../../database/entities';

import { AdminViolationsController } from './admin-violations.controller';
import { AdminViolationsService } from './admin-violations.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderViolation])],
  controllers: [AdminViolationsController],
  providers: [AdminViolationsService],
  exports: [AdminViolationsService],
})
export class AdminViolationsModule {}
