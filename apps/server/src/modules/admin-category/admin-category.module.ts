import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlatformCategory } from '../../database/entities';

import { AdminCategoryController } from './admin-category.controller';
import { AdminCategoryService } from './admin-category.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformCategory])],
  controllers: [AdminCategoryController],
  providers: [AdminCategoryService],
  exports: [AdminCategoryService],
})
export class AdminCategoryModule {}
