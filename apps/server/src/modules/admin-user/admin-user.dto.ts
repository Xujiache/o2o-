import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

const REALNAME_STATUSES = ['unverified', 'pending', 'verified', 'failed'] as const;
const ACCOUNT_STATUSES = ['active', 'disabled'] as const;
const STATUS_OPERATIONS = ['enable', 'disable'] as const;

export class ListCustomersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, enum: REALNAME_STATUSES })
  @IsOptional()
  @IsIn(REALNAME_STATUSES as readonly string[])
  realnameStatus?: (typeof REALNAME_STATUSES)[number];

  @ApiProperty({ required: false, enum: ACCOUNT_STATUSES })
  @IsOptional()
  @IsIn(ACCOUNT_STATUSES as readonly string[])
  accountStatus?: (typeof ACCOUNT_STATUSES)[number];

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

export class CustomerListItemVo {
  @ApiProperty()
  @Expose()
  userId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobileMasked!: string;

  @ApiProperty()
  @Expose()
  nickname!: string;

  @ApiProperty()
  @Expose()
  realnameStatus!: string;

  @ApiProperty()
  @Expose()
  accountStatus!: string;

  @ApiProperty({ required: false })
  @Expose()
  registeredAt?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  lastLoginAt?: string | null;
}

export class CustomerListPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [CustomerListItemVo] })
  list!: CustomerListItemVo[];
}

export class CustomerDetailVo {
  @ApiProperty()
  @Expose()
  userId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  mobileMasked!: string;

  @ApiProperty()
  @Expose()
  nickname!: string;

  @ApiProperty()
  @Expose()
  realnameStatus!: string;

  @ApiProperty()
  @Expose()
  accountStatus!: string;

  @ApiProperty()
  @Expose()
  profileCompleted!: boolean;

  @ApiProperty()
  @Expose()
  recentDevices!: Array<{ deviceId: string; platform: string; loginAt: string; status: string }>;

  @ApiProperty()
  @Expose()
  riskTags!: Array<{ tagType: string; reason: string | null; createdAt: string }>;
}

export class RealnameRecordItemVo {
  @ApiProperty()
  @Expose()
  recordId!: string;

  @ApiProperty()
  @Expose()
  @Mask('phone')
  realNameMasked!: string;

  @ApiProperty()
  @Expose()
  @Mask('idcard')
  idCardMasked!: string;

  @ApiProperty()
  @Expose()
  status!: string;

  @ApiProperty({ required: false })
  @Expose()
  failedReason?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  verifiedAt?: string | null;

  @ApiProperty()
  @Expose()
  createdAt!: string;
}

export class RealnameRecordPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [RealnameRecordItemVo] })
  list!: RealnameRecordItemVo[];
}

export class ChangeStatusDto {
  @ApiProperty({ enum: STATUS_OPERATIONS })
  @IsIn(STATUS_OPERATIONS as readonly string[])
  operation!: (typeof STATUS_OPERATIONS)[number];

  @ApiProperty({ description: '操作原因' })
  @IsString()
  @Length(1, 255)
  reason!: string;
}

export class ChangeStatusVo {
  @ApiProperty()
  userId!: string;
  @ApiProperty()
  accountStatus!: string;
}
