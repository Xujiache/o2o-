import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ErrandType } from '../../database/entities';

import { ErrandTypeController } from './errand-type.controller';
import { ErrandTypeService } from './errand-type.service';

@Module({
  imports: [TypeOrmModule.forFeature([ErrandType])],
  controllers: [ErrandTypeController],
  providers: [ErrandTypeService],
  exports: [ErrandTypeService],
})
export class ErrandTypeModule {}
