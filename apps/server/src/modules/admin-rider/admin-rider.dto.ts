import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsInt, IsObject, IsOptional, IsString, Length, Min, ValidateIf } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export class ListRidersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'disabled'])
  auditStatus?: string;

  @ApiProperty({ required: false, enum: ['active', 'disabled'] })
  @IsOptional()
  @IsIn(['active', 'disabled'])
  accountStatus?: string;

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
  pageSize?: number;
}

export class RiderListItemVo {
  @ApiProperty()
  @Expose()
  applicationId!: string;

  @ApiProperty({ required: false })
  @Expose()
  riderId?: string | null;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobile!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  realName!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  idCardNo!: string;

  @ApiProperty()
  @Expose()
  auditStatus!: string;

  @ApiProperty()
  @Expose()
  submittedAt!: string;
}

export class RiderListPageVo {
  @ApiProperty()
  pageNo!: number;

  @ApiProperty()
  pageSize!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: [RiderListItemVo] })
  list!: RiderListItemVo[];
}

export class RiderCertificateFileVo {
  @ApiProperty()
  @Expose()
  certType!: string;

  @ApiProperty()
  @Expose()
  fileId!: string;

  @ApiProperty({ required: false })
  @Expose()
  url?: string | null;
}

export class RiderDetailVo {
  @ApiProperty()
  @Expose()
  applicationId!: string;

  @ApiProperty({ required: false })
  @Expose()
  riderId?: string | null;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobile!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  realName!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  idCardNo!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  healthCertNo!: string;

  @ApiProperty()
  @Expose()
  healthCertExpiry!: string;

  @ApiProperty()
  @Expose()
  auditStatus!: string;

  @ApiProperty({ required: false })
  @Expose()
  rejectReason?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  accountStatus?: string;

  @ApiProperty({ required: false })
  @Expose()
  onlineStatus?: string;

  @ApiProperty({ required: false })
  @Expose()
  vehicleType?: string;

  @ApiProperty({ required: false })
  @Expose()
  plateNo?: string | null;

  @ApiProperty({ type: [RiderCertificateFileVo] })
  @Expose()
  certificates!: RiderCertificateFileVo[];

  @ApiProperty()
  @Expose()
  submittedAt!: string;
}

export class AuditRiderDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  auditResult!: 'approved' | 'rejected';

  @ApiProperty({ required: false })
  @ValidateIf((o: AuditRiderDto) => o.auditResult === 'rejected')
  @IsString()
  @Length(1, 500)
  rejectReason?: string;
}

export class AuditRiderVo {
  @ApiProperty({ required: false })
  riderId?: string | null;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  auditStatus!: string;
}

export class UpdateRiderStatusDto {
  @ApiProperty({ enum: ['enabled', 'disabled'] })
  @IsIn(['enabled', 'disabled'])
  targetStatus!: 'enabled' | 'disabled';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  reason?: string;
}

export interface GeoJsonPolygonInput {
  type: 'Polygon';
  coordinates: number[][][];
}

export class UpdateServiceAreaDto {
  @ApiProperty({ description: 'GeoJSON Polygon' })
  @IsObject()
  geometry!: GeoJsonPolygonInput;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxConcurrentOrders?: number;
}
