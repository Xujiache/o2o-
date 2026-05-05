import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';

export class TimeLimitedRulesDto {
  @ApiProperty({ enum: ['percent', 'fixed'] })
  @IsIn(['percent', 'fixed'])
  discountType!: 'percent' | 'fixed';

  @ApiProperty({ description: 'percent: 0-100;fixed: 单位分' })
  @IsInt()
  @Min(0)
  discountValue!: number;
}

export class FullOffTierDto {
  @ApiProperty({ example: 5000 })
  @IsInt()
  @Min(0)
  minAmount!: number;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(0)
  offAmount!: number;
}

export class SingleFullOffRulesDto {
  @ApiProperty({ type: [FullOffTierDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FullOffTierDto)
  tiers!: FullOffTierDto[];
}

export class CreatePromotionDto {
  @ApiProperty({ enum: ['time_limited', 'single_full_off'] })
  @IsIn(['time_limited', 'single_full_off'])
  promoType!: 'time_limited' | 'single_full_off';

  @ApiProperty()
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds!: string[];

  @ApiProperty({ description: 'time_limited 用 TimeLimitedRulesDto;single_full_off 用 SingleFullOffRulesDto' })
  rules!: TimeLimitedRulesDto | SingleFullOffRulesDto;

  @ApiProperty({ example: 1700000000000 })
  @IsInt()
  startTime!: number;

  @ApiProperty({ example: 1700100000000 })
  @IsInt()
  endTime!: number;
}

export class CreatePromotionVo {
  @ApiProperty()
  promoId!: string;
  @ApiProperty()
  status!: string;
}

export class PromotionItemVo {
  @ApiProperty()
  promoId!: string;
  @ApiProperty()
  storeId!: string;
  @ApiProperty()
  promoType!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ type: [String] })
  productIds!: string[];
  @ApiProperty()
  status!: string;
  @ApiProperty()
  startTime!: string;
  @ApiProperty()
  endTime!: string;
}

export class ListPromotionsQueryDto {
  @ApiProperty({ required: false, enum: ['draft', 'scheduled', 'active', 'paused', 'ended'] })
  @IsOptional()
  @IsIn(['draft', 'scheduled', 'active', 'paused', 'ended'])
  status?: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
}

export class SetPromoStatusDto {
  @ApiProperty({ enum: ['scheduled', 'paused', 'active', 'ended'] })
  @IsIn(['scheduled', 'paused', 'active', 'ended'])
  status!: 'scheduled' | 'paused' | 'active' | 'ended';
}
