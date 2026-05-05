import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminMerchantStatisticsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
  @ApiProperty({ required: false, description: 'YYYYMMDD,默认昨天' }) @IsOptional() @IsInt() snapshotDate?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminMerchantStatisticsItemVo {
  @ApiProperty() snapshotId!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() snapshotDate!: number;
  @ApiProperty() orderCount!: number;
  @ApiProperty() grossCents!: string;
  @ApiProperty() refundCents!: string;
  @ApiProperty() netCents!: string;
  @ApiProperty() storeRating!: string;
}

export class AdminMerchantStatisticsListVo {
  @ApiProperty({ type: [AdminMerchantStatisticsItemVo] }) items!: AdminMerchantStatisticsItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
