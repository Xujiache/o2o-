import { Module } from '@nestjs/common';

import { TrackModule } from '../track/track.module';

import { AdminTrackReplayController } from './admin-track-replay.controller';

@Module({
  imports: [TrackModule],
  controllers: [AdminTrackReplayController],
})
export class AdminTrackReplayModule {}
