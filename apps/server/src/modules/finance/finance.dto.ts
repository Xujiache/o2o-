import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PatchRateRuleDto {
  @ApiProperty() @IsString() cityCode!: string;
  @ApiProperty({ required: false, nullable: true }) @IsOptional() @IsString() categoryId?: string | null;
  @ApiProperty() @IsInt() @Min(0) merchantCommissionRate!: number;
  @ApiProperty() @IsString() riderServiceFee!: string;
  @ApiProperty() @IsInt() @Min(0) withdrawFeeRate!: number;
  @ApiProperty() @IsIn(['T1', 'WEEKLY', 'MONTHLY']) settlementCycle!: 'T1' | 'WEEKLY' | 'MONTHLY';
  @ApiProperty() @IsInt() effectiveAt!: number;
}

export class RateRulePatchVo {
  @ApiProperty() ruleId!: string;
  @ApiProperty() effectiveAt!: number;
}

export class RateRulesQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() cityCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class RateRuleItemVo {
  @ApiProperty() rateRuleId!: string;
  @ApiProperty() cityCode!: string;
  @ApiProperty({ nullable: true }) categoryId!: string | null;
  @ApiProperty() merchantCommissionRate!: number;
  @ApiProperty() riderServiceFee!: string;
  @ApiProperty() withdrawFeeRate!: number;
  @ApiProperty() settlementCycle!: string;
  @ApiProperty() effectiveAt!: number;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: number;
}

export class RateRulesListVo {
  @ApiProperty({ type: [RateRuleItemVo] }) items!: RateRuleItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
