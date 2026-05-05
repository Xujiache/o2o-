import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, Length, Matches } from 'class-validator';

import { Mask } from '../../common/decorators/mask.decorator';

export class SubmitApplicationDto {
  @ApiProperty({ example: '13800000001' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: 'mobile must be a valid 11-digit Chinese mobile' })
  mobile!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'smsCode must be 6 digits' })
  smsCode!: string;

  @ApiProperty({ example: 'file-license-001' })
  @IsString()
  @Length(1, 64)
  licenseFileId!: string;

  @ApiProperty({ required: false, example: 'file-food-001' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  foodPermitFileId?: string;

  @ApiProperty({ example: 'file-id-front-001' })
  @IsString()
  @Length(1, 64)
  idCardFrontFileId!: string;

  @ApiProperty({ example: 'file-id-back-001' })
  @IsString()
  @Length(1, 64)
  idCardBackFileId!: string;

  @ApiProperty({ type: [String], example: ['file-store-001', 'file-store-002'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  storePhotoFileIds!: string[];

  @ApiProperty({ example: '张三' })
  @IsString()
  @Length(2, 50)
  legalPerson!: string;

  @ApiProperty({ example: '110101199001011234' })
  @IsString()
  @Length(15, 18)
  idCardNo!: string;

  @ApiProperty({ example: '91110000MA001ABCD1' })
  @IsString()
  @Length(15, 30)
  licenseNo!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  foodPermitNo?: string;

  @ApiProperty({ example: '张三家烧烤' })
  @IsString()
  @Length(1, 128)
  storeName!: string;

  @ApiProperty({ example: '中餐' })
  @IsString()
  @Length(1, 255)
  businessScope!: string;
}

export class SubmitApplicationVo {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ example: 'pending' })
  auditStatus!: string;

  @ApiProperty()
  submittedAt!: number;
}

export class OnboardingStatusVo {
  @ApiProperty({ enum: ['pending', 'approved', 'rejected', 'disabled'] })
  @Expose()
  auditStatus!: string;

  @ApiProperty({ required: false })
  @Expose()
  rejectReason?: string | null;

  @ApiProperty()
  @Expose()
  canResubmit!: boolean;

  @ApiProperty({ required: false })
  @Expose()
  lastSubmittedAt?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  storeName?: string | null;

  @ApiProperty({ required: false })
  @Expose()
  @Mask('phone')
  legalPerson?: string;
}
