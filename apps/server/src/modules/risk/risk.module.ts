import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RiskExceptionLog } from '../../database/entities';

import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [TypeOrmModule.forFeature([RiskExceptionLog])],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
