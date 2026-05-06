import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class EarningQueryDto {
  @ApiProperty({ required: false, description: 'YYYYMMDD,起始' }) @IsOptional() @IsInt() fromDate?: number;
  @ApiProperty({ required: false, description: 'YYYYMMDD,结束' }) @IsOptional() @IsInt() toDate?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class EarningItemVo {
  @ApiProperty() earningId!: string;
  @ApiProperty() settleDate!: number;
  @ApiProperty() orderCount!: number;
  @ApiProperty() baseAmount!: string;
  @ApiProperty() distanceAmount!: string;
  @ApiProperty() timelyBonus!: string;
  @ApiProperty() rewardAmount!: string;
  @ApiProperty() deductAmount!: string;
  @ApiProperty() totalAmount!: string;
  @ApiProperty() status!: string;
}

export class EarningSummaryVo {
  @ApiProperty() totalIncome!: string;
  @ApiProperty() orderCount!: number;
  @ApiProperty() rewardAmount!: string;
  @ApiProperty() deductAmount!: string;
  @ApiProperty({ type: [EarningItemVo] }) items!: EarningItemVo[];
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
