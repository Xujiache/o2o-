import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiderAssessment } from '../../database/entities';

import { RiderAssessmentController } from './rider-assessment.controller';
import { RiderAssessmentService } from './rider-assessment.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiderAssessment])],
  controllers: [RiderAssessmentController],
  providers: [RiderAssessmentService],
  exports: [RiderAssessmentService],
})
export class RiderAssessmentModule {}
