import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export const GROCERY_ORDER_STATUSES = [
  'wait_pay',
  'paid',
  'picking',
  'weigh_settled',
  'pickup_ready',
  'picked_up',
  'cancelled',
  'refunded',
] as const;
export type GroceryOrderStatus = (typeof GROCERY_ORDER_STATUSES)[number];

export class SubmitOrderItemDto {
  @ApiProperty({ description: '商品 ID' })
  @IsString()
  productId!: string;

  @ApiProperty({ description: '份数(weight=份数/piece=件数/sku=数量)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  portions!: number;

  @ApiProperty({ required: false, description: '规格 SKU ID(仅当商品 priced_by=sku 时必填)' })
  @IsOptional()
  @IsString()
  skuId?: string;
}

export class SubmitGroceryOrderDto {
  @ApiProperty()
  @IsString()
  pickupPointId!: string;

  @ApiProperty({ type: [SubmitOrderItemDto], description: '至少 1 项, 最多 30 项' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => SubmitOrderItemDto)
  items!: SubmitOrderItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}

export class CancelGroceryOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class ListGroceryOrdersQueryDto {
  @ApiProperty({ required: false, enum: GROCERY_ORDER_STATUSES })
  @IsOptional()
  @IsEnum(GROCERY_ORDER_STATUSES)
  status?: GroceryOrderStatus;

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

export class GroceryOrderItemVo {
  @ApiProperty() @Expose() itemId!: string;
  @ApiProperty() @Expose() productId!: string;
  @ApiProperty() @Expose() productNameSnapshot!: string;
  @ApiProperty({ required: false, description: '规格 SKU ID(仅 sku 商品非空)' })
  @Expose()
  skuId?: string | null;
  @ApiProperty({ required: false, description: '规格名快照' })
  @Expose()
  skuSpecSnapshot?: string | null;
  @ApiProperty({ description: '1=按斤(需拣货称重) 0=按件/SKU(下单即定价)' })
  @Expose()
  isWeighted!: number;
  @ApiProperty() @Expose() unitPriceCentsPerJin!: string;
  @ApiProperty() @Expose() estimatedPerPortionGrams!: number;
  @ApiProperty() @Expose() portions!: number;
  @ApiProperty() @Expose() estimatedWeightGrams!: number;
  @ApiProperty() @Expose() estimatedLineCents!: string;
  @ApiProperty({ required: false }) @Expose() finalWeightGrams?: number | null;
  @ApiProperty({ required: false }) @Expose() finalLineCents?: string | null;
  @ApiProperty() @Expose() hasTraceability!: number;
}

export class GroceryOrderVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() customerId!: string;
  @ApiProperty() @Expose() pickupPointId!: string;
  @ApiProperty({ required: false }) @Expose() pickupPointSnapshot?: unknown;
  @ApiProperty() @Expose() status!: GroceryOrderStatus;
  @ApiProperty() @Expose() estimatedAmountCents!: string;
  @ApiProperty({ required: false }) @Expose() finalAmountCents?: string | null;
  @ApiProperty({ required: false }) @Expose() weightDeltaCents?: string | null;
  @ApiProperty({ required: false }) @Expose() estimatePaymentOrderId?: string | null;
  @ApiProperty({ required: false }) @Expose() deltaPaymentOrderId?: string | null;
  @ApiProperty({ required: false }) @Expose() deltaRefundOrderId?: string | null;
  @ApiProperty({ required: false }) @Expose() pickupCode?: string | null;
  @ApiProperty({ required: false }) @Expose() paidAt?: string | null;
  @ApiProperty({ required: false }) @Expose() pickingStartedAt?: string | null;
  @ApiProperty({ required: false }) @Expose() weighSettledAt?: string | null;
  @ApiProperty({ required: false }) @Expose() pickupReadyAt?: string | null;
  @ApiProperty({ required: false }) @Expose() pickedUpAt?: string | null;
  @ApiProperty({ required: false }) @Expose() cancelledAt?: string | null;
  @ApiProperty({ required: false }) @Expose() cancelReason?: string | null;
  @ApiProperty({ required: false }) @Expose() remark?: string | null;
  @ApiProperty() @Expose() createdAt!: string;
  @ApiProperty() @Expose() updatedAt!: string;
  @ApiProperty({ type: [GroceryOrderItemVo] })
  @Expose()
  items!: GroceryOrderItemVo[];
}

export class ListGroceryOrdersVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [GroceryOrderVo] })
  list!: GroceryOrderVo[];
}

export class GroceryOrderMutationVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: GroceryOrderStatus;
  @ApiProperty() updatedAt!: string;
}
