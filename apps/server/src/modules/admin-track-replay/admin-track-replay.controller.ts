import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminJwtGuard } from '../auth/guards/scope-jwt.guard';
import { TrackService } from '../track/track.service';

export class TrackReplayQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() riderTaskId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() riderId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() from?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() to?: number;
}

export class TrackPointVo {
  @ApiProperty() lng!: string;
  @ApiProperty() lat!: string;
  @ApiProperty() recordedAt!: number;
}

export class TrackReplayVo {
  @ApiProperty() count!: number;
  @ApiProperty({ type: [TrackPointVo] }) points!: TrackPointVo[];
}

@ApiTags('admin-track-replay')
@Controller('admin/track-replay')
@UseGuards(AdminJwtGuard, PermissionGuard)
@ApiBearerAuth('Admin-Token')
export class AdminTrackReplayController {
  constructor(private readonly trackService: TrackService) {}

  @Get()
  @RequirePermission('admin:track-replay:view')
  @ApiOperation({ summary: '平台轨迹回放(按 riderTaskId 或 rider+时间窗)' })
  @ApiOkResponse({ type: TrackReplayVo })
  async query(@Query() q: TrackReplayQueryDto): Promise<TrackReplayVo> {
    if (q.riderTaskId) {
      const range = q.from && q.to ? { from: q.from, to: q.to } : undefined;
      const points = await this.trackService.queryByTaskId(q.riderTaskId, range);
      return {
        count: points.length,
        points: points.map((p) => ({ lng: p.lng, lat: p.lat, recordedAt: Number(p.recordedAt) })),
      };
    }
    if (q.riderId && q.from) {
      const points = await this.trackService.queryByRiderId(q.riderId, q.from);
      return {
        count: points.length,
        points: points.map((p) => ({ lng: p.lng, lat: p.lat, recordedAt: Number(p.recordedAt) })),
      };
    }
    return { count: 0, points: [] };
  }
}
