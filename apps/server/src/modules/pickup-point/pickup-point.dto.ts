import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const PICKUP_POINT_STATUSES = ['active', 'suspended', 'offline'] as const;
export type PickupPointStatus = (typeof PICKUP_POINT_STATUSES)[number];

/** ===== 公开查询(c 端) ===== */

export class PublicListPickupPointsQueryDto {
  @ApiProperty({ required: false, description: '用户经度,带上后按距离升序' })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  lng?: number;

  @ApiProperty({ required: false, description: '用户纬度,带上后按距离升序' })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  lat?: number;

  @ApiProperty({ required: false, description: '城市编码筛选' })
  @IsOptional()
  @IsString()
  cityCode?: string;

  @ApiProperty({ required: false, default: 50, description: '最多返回多少个' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class PublicPickupPointVo {
  @ApiProperty()
  @Expose()
  pickupPointId!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  address!: string;

  @ApiProperty({ required: false })
  @Expose()
  cityCode?: string | null;

  @ApiProperty()
  @Expose()
  lng!: string;

  @ApiProperty()
  @Expose()
  lat!: string;

  @ApiProperty()
  @Expose()
  businessHourStart!: string;

  @ApiProperty()
  @Expose()
  businessHourEnd!: string;

  @ApiProperty({ required: false })
  @Expose()
  contactPhone?: string | null;

  @ApiProperty()
  @Expose()
  status!: PickupPointStatus;

  @ApiProperty({ required: false })
  @Expose()
  notice?: string | null;

  @ApiProperty({ required: false, description: '距用户距离(米),仅当传 lng/lat 时返回' })
  @Expose()
  distanceMeters?: number;
}

export class PublicListPickupPointsVo {
  @ApiProperty({ type: [PublicPickupPointVo] })
  list!: PublicPickupPointVo[];
}

/** ===== admin CRUD ===== */

export class AdminListPickupPointsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, enum: PICKUP_POINT_STATUSES })
  @IsOptional()
  @IsEnum(PICKUP_POINT_STATUSES)
  status?: PickupPointStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class AdminPickupPointVo extends PublicPickupPointVo {
  @ApiProperty()
  @Expose()
  createdAt!: string;

  @ApiProperty()
  @Expose()
  updatedAt!: string;
}

export class AdminListPickupPointsVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [AdminPickupPointVo] })
  list!: AdminPickupPointVo[];
}

export class CreatePickupPointDto {
  @ApiProperty({ example: '天安门自提点' })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ example: '北京市东城区东长安街1号' })
  @IsString()
  @Length(1, 255)
  address!: string;

  @ApiProperty({ required: false, example: 'BJ' })
  @IsOptional()
  @IsString()
  @Length(2, 16)
  cityCode?: string;

  @ApiProperty({ example: 116.397428 })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: 39.90923 })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ required: false, example: '09:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'businessHourStart 必须为 HH:mm' })
  businessHourStart?: string;

  @ApiProperty({ required: false, example: '21:00' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'businessHourEnd 必须为 HH:mm' })
  businessHourEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  contactPhone?: string;

  @ApiProperty({ required: false, enum: PICKUP_POINT_STATUSES, default: 'active' })
  @IsOptional()
  @IsEnum(PICKUP_POINT_STATUSES)
  status?: PickupPointStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  notice?: string;
}

export class UpdatePickupPointDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(2, 16)
  cityCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  businessHourStart?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  businessHourEnd?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 32)
  contactPhone?: string;

  @ApiProperty({ required: false, enum: PICKUP_POINT_STATUSES })
  @IsOptional()
  @IsEnum(PICKUP_POINT_STATUSES)
  status?: PickupPointStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  notice?: string;
}

export class PickupPointMutationVo {
  @ApiProperty()
  pickupPointId!: string;

  @ApiProperty()
  updatedAt!: string;
}
