import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CitySite } from '../../database/entities';

import { AdminCityController } from './admin-city.controller';
import { AdminCityService } from './admin-city.service';

@Module({
  imports: [TypeOrmModule.forFeature([CitySite])],
  controllers: [AdminCityController],
  providers: [AdminCityService],
  exports: [AdminCityService],
})
export class AdminCityModule {}
