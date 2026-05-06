import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrackPoint } from '../../database/entities';

import { TrackService } from './track.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrackPoint])],
  providers: [TrackService],
  exports: [TrackService],
})
export class TrackModule {}
