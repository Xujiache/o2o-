import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

import type { GroceryOrderStatus, ProductPricingMode, ProductWeightUnit } from '../../database/entities';

export class GroceryOrderItemDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty({ description: 'fixed: 份数; weighed: 预估克数' })
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PreviewGroceryOrderDto {
  @ApiProperty({ type: [GroceryOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => GroceryOrderItemDto)
  items!: GroceryOrderItemDto[];

  @ApiProperty() @IsString() pickupPointId!: string;
  @ApiProperty() @IsString() pickupSlotId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() userCouponId?: string;
}

export class SubmitGroceryOrderDto {
  @ApiProperty() @IsString() previewId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(0, 512) remark?: string;
}

export class GroceryOrderItemVo {
  @ApiProperty() groceryOrderItemId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty({ nullable: true }) coverImageFileId!: string | null;
  @ApiProperty() pricingMode!: ProductPricingMode;
  @ApiProperty({ nullable: true }) weightUnit!: ProductWeightUnit | null;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() estimatedQuantity!: number;
  @ApiProperty({ nullable: true }) actualQuantity!: number | null;
  @ApiProperty() estimatedSubtotal!: string;
  @ApiProperty({ nullable: true }) actualSubtotal!: string | null;
}

export class PreviewGroceryOrderVo {
  @ApiProperty() previewId!: string;
  @ApiProperty() expireSeconds!: number;
  @ApiProperty({ type: [GroceryOrderItemVo] }) items!: GroceryOrderItemVo[];
  @ApiProperty() estimatedGoodsAmount!: string;
  @ApiProperty() discountAmount!: string;
  @ApiProperty() estimatedPayableAmount!: string;
  @ApiProperty({ description: '是否含称重商品' }) hasWeighedItem!: boolean;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() pickupSlotId!: string;
  @ApiProperty() pickupDate!: string;
  @ApiProperty() pickupStartMinute!: number;
  @ApiProperty() pickupEndMinute!: number;
}

export class SubmitGroceryOrderVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() estimatedPayableAmount!: string;
  @ApiProperty() expireAt!: number;
  @ApiProperty({ description: '支付参数(透传 payment 服务)' }) payParams!: Record<string, unknown>;
}

export class ListGroceryOrdersQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: GroceryOrderStatus;
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class GroceryOrderListItemVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() status!: GroceryOrderStatus;
  @ApiProperty() estimatedPayableAmount!: string;
  @ApiProperty({ nullable: true }) finalPayableAmount!: string | null;
  @ApiProperty() pickupDate!: string;
  @ApiProperty() pickupStartMinute!: number;
  @ApiProperty() pickupEndMinute!: number;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() itemsPreview!: { productName: string; quantity: number }[];
  @ApiProperty() createdAt!: number;
}

export class GroceryOrderListPageVo {
  @ApiProperty({ type: [GroceryOrderListItemVo] }) items!: GroceryOrderListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class GroceryOrderDetailVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() status!: GroceryOrderStatus;
  @ApiProperty() payStatus!: string;
  @ApiProperty({ nullable: true, description: '提货码 6 位明文,仅本人详情返回' }) pickupCode!: string | null;
  @ApiProperty({ nullable: true, description: '提货 QR payload PICKUP:<orderNo>:<code>' }) pickupQrPayload!:
    | string
    | null;
  @ApiProperty() estimatedGoodsAmount!: string;
  @ApiProperty() discountAmount!: string;
  @ApiProperty() estimatedPayableAmount!: string;
  @ApiProperty({ nullable: true }) finalGoodsAmount!: string | null;
  @ApiProperty({ nullable: true }) finalPayableAmount!: string | null;
  @ApiProperty({ nullable: true, description: '正=需补付 负=待退款' }) diffAmount!: string | null;
  @ApiProperty({ nullable: true }) diffPayStatus!: string | null;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() pickupDate!: string;
  @ApiProperty() pickupStartMinute!: number;
  @ApiProperty() pickupEndMinute!: number;
  @ApiProperty() expireAt!: number;
  @ApiProperty({ nullable: true }) paidAt!: number | null;
  @ApiProperty({ nullable: true }) pickedUpAt!: number | null;
  @ApiProperty({ type: [GroceryOrderItemVo] }) items!: GroceryOrderItemVo[];
  @ApiProperty() createdAt!: number;
}

export class CancelGroceryOrderDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(0, 255) reason?: string;
}

export class CancelGroceryOrderVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() status!: GroceryOrderStatus;
}
