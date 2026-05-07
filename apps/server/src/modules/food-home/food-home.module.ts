import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CitySite, PlatformCategory, Store } from '../../database/entities';
import { FileModule } from '../file/file.module';

import { FoodHomeController } from './food-home.controller';
import { FoodHomeService } from './food-home.service';

@Module({
  imports: [TypeOrmModule.forFeature([CitySite, PlatformCategory, Store]), FileModule],
  controllers: [FoodHomeController],
  providers: [FoodHomeService],
  exports: [FoodHomeService],
})
export class FoodHomeModule {}
