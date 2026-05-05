import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CitySite, PlatformCategory, Store } from '../../database/entities';

import { FoodHomeController } from './food-home.controller';
import { FoodHomeService } from './food-home.service';

@Module({
  imports: [TypeOrmModule.forFeature([CitySite, PlatformCategory, Store])],
  controllers: [FoodHomeController],
  providers: [FoodHomeService],
  exports: [FoodHomeService],
})
export class FoodHomeModule {}
