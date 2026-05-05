import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class SettlementListQueryDto {
  @ApiProperty({ required: false, description: '月份 YYYYMM' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/)
  month?: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class SettlementListItemVo {
  @ApiProperty() settlementId!: string;
  @ApiProperty() settlementNo!: string;
  @ApiProperty() periodStart!: number;
  @ApiProperty() periodEnd!: number;
  @ApiProperty() grossCents!: string;
  @ApiProperty() commissionCents!: string;
  @ApiProperty() feeCents!: string;
  @ApiProperty() netCents!: string;
  @ApiProperty() orderCount!: number;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: number;
}

export class SettlementListVo {
  @ApiProperty({ type: [SettlementListItemVo] }) items!: SettlementListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
