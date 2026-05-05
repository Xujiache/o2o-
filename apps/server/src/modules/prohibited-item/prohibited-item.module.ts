import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProhibitedItem } from '../../database/entities';

import { ProhibitedItemService } from './prohibited-item.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProhibitedItem])],
  providers: [ProhibitedItemService],
  exports: [ProhibitedItemService],
})
export class ProhibitedItemModule {}
