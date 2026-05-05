import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateNested,
} from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export const VEHICLE_TYPES = ['electric_bike', 'motorcycle', 'car'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const RIDER_CERT_TYPES = [
  'id_card_front',
  'id_card_back',
  'face_video',
  'health_cert',
  'driver_license',
  'vehicle_license',
] as const;
export type RiderCertType = (typeof RIDER_CERT_TYPES)[number];

export class CertificateItemDto {
  @ApiProperty({ enum: RIDER_CERT_TYPES })
  @IsIn(RIDER_CERT_TYPES as readonly string[])
  certType!: RiderCertType;

  @ApiProperty({ example: 'file-id-001' })
  @IsString()
  @Length(1, 64)
  fileObjectId!: string;
}

export class VehicleInfoDto {
  @ApiProperty({ enum: VEHICLE_TYPES })
  @IsIn(VEHICLE_TYPES as readonly string[])
  vehicleType!: VehicleType;

  @ApiProperty({ required: false, example: '京A12345' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  plateNo?: string;

  @ApiProperty({ required: false, example: '雅迪' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  brand?: string;
}

export class SubmitRiderApplicationDto {
  @ApiProperty({ example: '骑手张三' })
  @IsString()
  @Length(2, 50)
  realName!: string;

  @ApiProperty({ example: '110101199001011234' })
  @IsString()
  @Matches(/^\d{17}[\dXx]$/, { message: 'idCardNo must be 18-digit (last char may be X)' })
  idCardNo!: string;

  @ApiProperty({ example: 'HC202501001' })
  @IsString()
  @Length(5, 50)
  healthCertNo!: string;

  @ApiProperty({ example: 1782345600000, description: '健康证到期时间(毫秒)' })
  @IsInt()
  healthCertExpiry!: number;

  @ApiProperty({ type: VehicleInfoDto })
  @ValidateNested()
  @Type(() => VehicleInfoDto)
  vehicle!: VehicleInfoDto;

  @ApiProperty({
    type: [CertificateItemDto],
    description: '5 资质文件:身份证正/反 + 人脸视频 + 健康证 + 驾驶证 + 行驶证',
  })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CertificateItemDto)
  certificates!: CertificateItemDto[];
}

export class SubmitRiderApplicationVo {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ example: 'pending' })
  auditStatus!: string;

  @ApiProperty()
  submittedAt!: number;
}

export class RiderOnboardingStatusVo {
  @ApiProperty()
  @Expose()
  hasApplication!: boolean;

  @ApiProperty({ required: false })
  @Expose()
  applicationId?: string;

  @ApiProperty({ required: false, enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @Expose()
  auditStatus?: string;

  @ApiProperty({ required: false })
  @Expose()
  rejectReason?: string | null;

  @ApiProperty()
  @Expose()
  canResubmit!: boolean;

  @ApiProperty({ required: false })
  @Expose()
  submittedAt?: string;

  @ApiProperty({ required: false })
  @Expose()
  @Mask('idcard')
  realName?: string;
}
