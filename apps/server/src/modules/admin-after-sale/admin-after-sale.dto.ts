import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminAfterSaleQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminAfterSaleListItemVo {
  @ApiProperty() afterSaleId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() customerId!: string;
  @ApiProperty() type!: string;
  @ApiProperty() reason!: string;
  @ApiProperty() amountCents!: string;
  @ApiProperty() status!: string;
  @ApiProperty() appliedAt!: number;
  @ApiProperty({ nullable: true }) merchantReviewAt!: number | null;
  @ApiProperty() createdAt!: number;
}

export class AdminAfterSaleListVo {
  @ApiProperty({ type: [AdminAfterSaleListItemVo] }) items!: AdminAfterSaleListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class AdminAfterSaleDetailVo extends AdminAfterSaleListItemVo {
  @ApiProperty({ nullable: true }) merchantRejectReason!: string | null;
  @ApiProperty({ nullable: true }) completedAt!: number | null;
  @ApiProperty({ type: [String] }) evidenceFileIds!: string[];
}
