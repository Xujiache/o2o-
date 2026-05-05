import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';

export const TARGET_STATUS = ['online', 'offline'] as const;
export type TargetStatus = (typeof TARGET_STATUS)[number];

export const PLATFORMS = ['android', 'ios'] as const;
export type Platform = (typeof PLATFORMS)[number];

export class UpdateOnlineStatusDto {
  @ApiProperty({ enum: TARGET_STATUS })
  @IsIn(TARGET_STATUS as readonly string[])
  targetStatus!: TargetStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  deviceToken?: string;

  @ApiProperty({ enum: PLATFORMS, required: false })
  @IsOptional()
  @IsIn(PLATFORMS as readonly string[])
  platform?: Platform;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLongitude()
  currentLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsLatitude()
  currentLat?: number;
}

export class UpdateOnlineStatusVo {
  @ApiProperty({ enum: ['online', 'offline', 'busy'] })
  riderStatus!: string;

  @ApiProperty()
  canAcceptOrder!: boolean;

  @ApiProperty({ required: false })
  reason?: string;
}

export class LocationPointDto {
  @ApiProperty()
  @IsLongitude()
  lng!: number;

  @ApiProperty()
  @IsLatitude()
  lat!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  accuracy?: number;

  @ApiProperty({ description: '上报时间(毫秒)' })
  @IsInt()
  reportedAt!: number;
}

export class LocationBatchDto {
  @ApiProperty({ description: '批次 ID,作为幂等 key' })
  @IsString()
  @Length(1, 64)
  batchId!: string;

  @ApiProperty({ type: [LocationPointDto], description: '位置点(1~50)' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points!: LocationPointDto[];
}

export class LocationBatchVo {
  @ApiProperty()
  acceptedCount!: number;

  @ApiProperty()
  serverTime!: number;
}
