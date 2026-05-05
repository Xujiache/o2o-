import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminWithdrawalQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminWithdrawalListItemVo {
  @ApiProperty() withdrawalId!: string;
  @ApiProperty() withdrawalNo!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() amountCents!: string;
  @ApiProperty() status!: string;
  @ApiProperty() submittedAt!: number;
  @ApiProperty({ nullable: true }) completedAt!: number | null;
  @ApiProperty({ nullable: true }) failReason!: string | null;
}

export class AdminWithdrawalListVo {
  @ApiProperty({ type: [AdminWithdrawalListItemVo] }) items!: AdminWithdrawalListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
