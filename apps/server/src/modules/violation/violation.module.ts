import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderViolation } from '../../database/entities';

import { ViolationController } from './violation.controller';
import { ViolationService } from './violation.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderViolation])],
  controllers: [ViolationController],
  providers: [ViolationService],
  exports: [ViolationService],
})
export class ViolationModule {}
