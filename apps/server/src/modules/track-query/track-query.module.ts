import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FoodOrder, RiderLocation, Store } from '../../database/entities';

import { TrackQueryController } from './track-query.controller';
import { TrackQueryService } from './track-query.service';

@Module({
  imports: [TypeOrmModule.forFeature([FoodOrder, Store, RiderLocation])],
  controllers: [TrackQueryController],
  providers: [TrackQueryService],
  exports: [TrackQueryService],
})
export class TrackQueryModule {}
