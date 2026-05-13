import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCouponDto {
  @ApiProperty() @IsString() @IsNotEmpty() couponName!: string;
  @ApiProperty() @IsIn(['AMOUNT', 'DISCOUNT']) couponType!: 'AMOUNT' | 'DISCOUNT';
  @ApiProperty() @IsIn(['FOOD', 'ERRAND', 'GROCERY', 'ALL']) bizType!: 'FOOD' | 'ERRAND' | 'GROCERY' | 'ALL';
  @ApiProperty() @IsString() threshold!: string;
  @ApiProperty() @IsString() discount!: string;
  @ApiProperty() @IsInt() @Min(1) totalStock!: number;
  @ApiProperty() @IsInt() validFrom!: number;
  @ApiProperty() @IsInt() validTo!: number;
}

export class CouponPublishVo {
  @ApiProperty() couponRuleId!: string;
  @ApiProperty() status!: string;
}

export class CouponsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bizType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class CouponItemVo {
  @ApiProperty() couponRuleId!: string;
  @ApiProperty() couponName!: string;
  @ApiProperty() couponType!: string;
  @ApiProperty() bizType!: string;
  @ApiProperty() threshold!: string;
  @ApiProperty() discount!: string;
  @ApiProperty() totalStock!: number;
  @ApiProperty() remainStock!: number;
  @ApiProperty() validFrom!: number;
  @ApiProperty() validTo!: number;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: number;
}

export class CouponsListVo {
  @ApiProperty({ type: [CouponItemVo] }) items!: CouponItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
