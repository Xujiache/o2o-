import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SysDict } from '../../database/entities';

import { DictController } from './dict.controller';
import { DictService } from './dict.service';

@Module({
  imports: [TypeOrmModule.forFeature([SysDict])],
  controllers: [DictController],
  providers: [DictService],
  exports: [DictService],
})
export class DictModule {}
