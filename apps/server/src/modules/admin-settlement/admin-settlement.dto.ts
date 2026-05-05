import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminSettlementQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminSettlementListItemVo {
  @ApiProperty() settlementId!: string;
  @ApiProperty() settlementNo!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() merchantId!: string;
  @ApiProperty() periodStart!: number;
  @ApiProperty() periodEnd!: number;
  @ApiProperty() grossCents!: string;
  @ApiProperty() commissionCents!: string;
  @ApiProperty() feeCents!: string;
  @ApiProperty() netCents!: string;
  @ApiProperty() orderCount!: number;
  @ApiProperty() refundCount!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) completedAt!: number | null;
  @ApiProperty() createdAt!: number;
}

export class AdminSettlementListVo {
  @ApiProperty({ type: [AdminSettlementListItemVo] }) items!: AdminSettlementListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
