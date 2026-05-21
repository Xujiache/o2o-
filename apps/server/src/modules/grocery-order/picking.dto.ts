import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class WeighItemDto {
  @ApiProperty({ required: false, description: 'final weight in grams; SKU/按件 商品不需要', example: 520 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  finalWeightGrams?: number;

  @ApiProperty({ required: false, description: 'bound qrcode ids (GR-5)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  boundQrcodeIds?: string[];
}

export class VerifyPickupDto {
  @ApiProperty({ description: '6-digit pickup code', example: '482103' })
  @IsString()
  @Length(4, 8)
  code!: string;
}

export class CancelForOOSDto {
  @ApiProperty({ description: 'out-of-stock reason' })
  @IsString()
  @Length(1, 255)
  reason!: string;
}

export class ListPickingQueryDto {
  @ApiProperty({
    required: false,
    enum: ['paid', 'picking', 'weigh_settled', 'pickup_ready'],
  })
  @IsOptional()
  @IsEnum(['paid', 'picking', 'weigh_settled', 'pickup_ready'])
  status?: 'paid' | 'picking' | 'weigh_settled' | 'pickup_ready';

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class PickingOrderListItemVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() estimatedAmountCents!: string;
  @ApiProperty({ required: false }) @Expose() finalAmountCents?: string | null;
  @ApiProperty({ required: false }) @Expose() weightDeltaCents?: string | null;
  @ApiProperty({ required: false }) @Expose() pickupCode?: string | null;
  @ApiProperty() @Expose() pickupPointId!: string;
  @ApiProperty() @Expose() pickupPointName!: string;
  @ApiProperty() @Expose() createdAt!: string;
  @ApiProperty() @Expose() itemCount!: number;
}

export class PickingOrderListVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [PickingOrderListItemVo] })
  list!: PickingOrderListItemVo[];
}

export class PickingItemVo {
  @ApiProperty() itemId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productNameSnapshot!: string;
  @ApiProperty() unitPriceCentsPerJin!: string;
  @ApiProperty() estimatedPerPortionGrams!: number;
  @ApiProperty() portions!: number;
  @ApiProperty() estimatedWeightGrams!: number;
  @ApiProperty() estimatedLineCents!: string;
  @ApiProperty({ required: false }) finalWeightGrams?: number | null;
  @ApiProperty({ required: false }) finalLineCents?: string | null;
  @ApiProperty({ required: false, type: [String] }) boundQrcodeIds?: string[] | null;
  @ApiProperty() hasTraceability!: number;
}

export class PickingDetailVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() estimatedAmountCents!: string;
  @ApiProperty({ required: false }) finalAmountCents?: string | null;
  @ApiProperty({ required: false }) weightDeltaCents?: string | null;
  @ApiProperty({ required: false }) pickupCode?: string | null;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty({ required: false }) pickupPointSnapshot?: unknown;
  @ApiProperty() createdAt!: string;
  @ApiProperty({ type: [PickingItemVo] }) items!: PickingItemVo[];
}

export class PickingMutationVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() updatedAt!: string;
  @ApiProperty({ required: false }) pickupCode?: string;
  @ApiProperty({ required: false }) finalAmountCents?: string;
  @ApiProperty({ required: false }) weightDeltaCents?: string;
}

export class WeighItemResultVo {
  @ApiProperty() itemId!: string;
  @ApiProperty() finalLineCents!: string;
  @ApiProperty({ description: 'all items weighed (can settle now)' }) allWeighed!: boolean;
}
