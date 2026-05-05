import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export class ListApplicationsQueryDto {
  @ApiProperty({ required: false, enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @IsOptional()
  @IsIn(['pending', 'approved', 'rejected', 'disabled'])
  auditStatus?: 'pending' | 'approved' | 'rejected' | 'disabled';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class ApplicationListItemVo {
  @ApiProperty()
  @Expose()
  applicationId!: string;

  @ApiProperty()
  @Expose()
  merchantId!: string;

  @ApiProperty()
  @Expose()
  storeName!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  legalPersonMasked!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  licenseNoMasked!: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @Expose()
  auditStatus!: string;

  @ApiProperty()
  @Expose()
  submittedAt!: string;
}

export class ApplicationListPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [ApplicationListItemVo] })
  list!: ApplicationListItemVo[];
}

export class LicenseFileVo {
  @ApiProperty()
  @Expose()
  licenseType!: string;

  @ApiProperty()
  @Expose()
  fileId!: string;

  @ApiProperty({ required: false })
  @Expose()
  url?: string | null;
}

export class ApplicationDetailVo {
  @ApiProperty()
  @Expose()
  applicationId!: string;

  @ApiProperty()
  @Expose()
  merchantId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobileMasked!: string;

  @ApiProperty()
  @Expose()
  storeName!: string;

  @ApiProperty()
  @Expose()
  businessScope!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  legalPersonMasked!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  idCardMasked!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  licenseNoMasked!: string;

  @ApiProperty({ required: false })
  @Expose()
  @Mask('idcard')
  foodPermitNoMasked?: string;

  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @Expose()
  auditStatus!: string;

  @ApiProperty({ required: false })
  @Expose()
  rejectReason?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  commissionRate?: string | null;

  @ApiProperty({ type: [LicenseFileVo] })
  @Expose()
  licenses!: LicenseFileVo[];

  @ApiProperty()
  @Expose()
  submittedAt!: string;
}

export class AuditDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  auditResult!: 'approved' | 'rejected';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  rejectReason?: string;

  @ApiProperty({ required: false, description: '通过时必填,0~1 浮点(0.05 = 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate?: number;
}

export class AuditVo {
  @ApiProperty()
  merchantId!: string;
  @ApiProperty({ required: false })
  storeId?: string | null;
  @ApiProperty()
  auditStatus!: string;
}

export class ListStoresQueryDto {
  @ApiProperty({ required: false, enum: ['online', 'offline', 'paused'] })
  @IsOptional()
  @IsIn(['online', 'offline', 'paused'])
  businessStatus?: 'online' | 'offline' | 'paused';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class StoreItemVo {
  @ApiProperty()
  @Expose()
  storeId!: string;
  @ApiProperty()
  @Expose()
  merchantId!: string;
  @ApiProperty()
  @Expose()
  name!: string;
  @ApiProperty()
  @Expose()
  businessStatus!: string;
  @ApiProperty()
  @Expose()
  commissionRate!: string | null;
}

export class ForceStatusDto {
  @ApiProperty({ enum: ['online', 'offline', 'paused'] })
  @IsIn(['online', 'offline', 'paused'])
  businessStatus!: 'online' | 'offline' | 'paused';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
