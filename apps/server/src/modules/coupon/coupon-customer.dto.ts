import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class AvailableCouponsQueryDto {
  @ApiProperty({ required: false, enum: ['FOOD', 'ERRAND', 'ALL'] })
  @IsOptional()
  @IsIn(['FOOD', 'ERRAND', 'ALL'])
  bizType?: 'FOOD' | 'ERRAND' | 'ALL';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class MyCouponsQueryDto {
  @ApiProperty({ required: false, enum: ['UNUSED', 'USED', 'EXPIRED'] })
  @IsOptional()
  @IsIn(['UNUSED', 'USED', 'EXPIRED'])
  status?: 'UNUSED' | 'USED' | 'EXPIRED';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class AvailableCouponItemVo {
  @ApiProperty() couponRuleId!: string;
  @ApiProperty() couponName!: string;
  @ApiProperty() couponType!: 'AMOUNT' | 'DISCOUNT';
  @ApiProperty() bizType!: 'FOOD' | 'ERRAND' | 'ALL';
  @ApiProperty() threshold!: string;
  @ApiProperty() discount!: string;
  @ApiProperty() remainStock!: number;
  @ApiProperty() validFrom!: number;
  @ApiProperty() validTo!: number;
  @ApiProperty() alreadyClaimed!: boolean;
}

export class AvailableCouponsListVo {
  @ApiProperty({ type: [AvailableCouponItemVo] }) items!: AvailableCouponItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class MyCouponItemVo {
  @ApiProperty() userCouponId!: string;
  @ApiProperty() couponRuleId!: string;
  @ApiProperty() couponName!: string;
  @ApiProperty() couponType!: 'AMOUNT' | 'DISCOUNT';
  @ApiProperty() bizType!: 'FOOD' | 'ERRAND' | 'ALL';
  @ApiProperty() threshold!: string;
  @ApiProperty() discount!: string;
  @ApiProperty() validFrom!: number;
  @ApiProperty() validTo!: number;
  @ApiProperty() status!: 'UNUSED' | 'USED' | 'EXPIRED';
  @ApiProperty() receivedAt!: number;
  @ApiProperty({ nullable: true }) usedAt!: number | null;
}

export class MyCouponsListVo {
  @ApiProperty({ type: [MyCouponItemVo] }) items!: MyCouponItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class ClaimCouponVo {
  @ApiProperty() userCouponId!: string;
  @ApiProperty() couponRuleId!: string;
}
