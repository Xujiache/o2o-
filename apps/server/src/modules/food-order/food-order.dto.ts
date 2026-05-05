import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import type {
  FoodOrderCancelledBy,
  FoodOrderDeliveryType,
  FoodOrderPayStatus,
  FoodOrderStatus,
} from '../../database/entities/food-order.entity';
import type { OrderTimelineActorType } from '../../database/entities/order-timeline.entity';

export class PreviewItemDto {
  @ApiProperty()
  @IsString()
  @Length(1, 32)
  skuId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PreviewOrderDto {
  @ApiProperty()
  @IsString()
  @Length(1, 32)
  storeId!: string;

  @ApiProperty({ type: [PreviewItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PreviewItemDto)
  items!: PreviewItemDto[];

  @ApiProperty()
  @IsString()
  @Length(1, 32)
  addressId!: string;

  @ApiProperty({ required: false, description: 'stage 5 任意值返 INVALID_PARAM COUPON_NOT_AVAILABLE' })
  @IsOptional()
  @IsString()
  couponId?: string;

  @ApiProperty({ required: false, description: 'stage 5 >0 返 INVALID_PARAM POINTS_NOT_AVAILABLE' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  pointsUsed?: number;

  @ApiProperty({ enum: ['instant', 'reserved'], default: 'instant' })
  @IsIn(['instant', 'reserved'])
  deliveryType!: FoodOrderDeliveryType;

  @ApiProperty({ required: false, description: 'reservedTime 毫秒时间戳,deliveryType=reserved 必填' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reservedTime?: number;
}

export class PreviewVo {
  @ApiProperty() @Expose() previewId!: string;
  @ApiProperty() @Expose() expiresAt!: number;
  @ApiProperty() @Expose() goodsAmount!: string;
  @ApiProperty() @Expose() deliveryFee!: string;
  @ApiProperty() @Expose() discountAmount!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty({ description: '预计送达时间(分钟)' }) @Expose() estimatedDeliveryTime!: number;
  @ApiProperty({ required: false, description: '若有不可用原因' }) @Expose() unavailableReason?: string;
}

export class SubmitOrderDto {
  @ApiProperty()
  @IsString()
  @Length(36, 64)
  previewId!: string;

  @ApiProperty({ enum: ['wxpay', 'alipay'] })
  @IsIn(['wxpay', 'alipay'])
  payChannel!: 'wxpay' | 'alipay';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 512)
  remark?: string;
}

export class SubmitOrderVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() expireAt!: number;
}

// === T12 list/detail ===

export class ListOrdersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: FoodOrderStatus;

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
  pageSize?: number;
}

export class FoodOrderListItemVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty() @Expose() payStatus!: FoodOrderPayStatus;
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() goodsAmount!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty({ description: '商品概要(取首条 sku 名 + n 件)' }) @Expose() itemsBrief!: string;
  @ApiProperty() @Expose() expireAt!: number;
  @ApiProperty() @Expose() createdAt!: number;
}

export class FoodOrderListPageVo {
  @ApiProperty() @Expose() pageNo!: number;
  @ApiProperty() @Expose() pageSize!: number;
  @ApiProperty() @Expose() total!: number;
  @ApiProperty({ type: [FoodOrderListItemVo] }) @Expose() list!: FoodOrderListItemVo[];
}

export class TimelineEntryVo {
  @ApiProperty({ required: false }) @Expose() fromStatus?: FoodOrderStatus | null;
  @ApiProperty() @Expose() toStatus!: FoodOrderStatus;
  @ApiProperty() @Expose() actorType!: OrderTimelineActorType;
  @ApiProperty({ required: false }) @Expose() reason?: string | null;
  @ApiProperty() @Expose() createdAt!: number;
}

export class FoodOrderItemVo {
  @ApiProperty() @Expose() skuId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() spec?: string | null;
  @ApiProperty({ required: false }) @Expose() iconUrl?: string | null;
  @ApiProperty() @Expose() quantity!: number;
  @ApiProperty() @Expose() unitPrice!: string;
  @ApiProperty() @Expose() subTotal!: string;
}

export class FoodOrderPaymentBriefVo {
  @ApiProperty() @Expose() payOrderId!: string;
  @ApiProperty() @Expose() payOrderNo!: string;
  @ApiProperty() @Expose() payChannel!: string;
  @ApiProperty() @Expose() status!: string;
}

export class FoodOrderDetailVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty() @Expose() payStatus!: FoodOrderPayStatus;
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() goodsAmount!: string;
  @ApiProperty() @Expose() deliveryFee!: string;
  @ApiProperty() @Expose() discountAmount!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() addressSnapshot!: unknown;
  @ApiProperty() @Expose() expireAt!: number;
  @ApiProperty({ required: false }) @Expose() paidAt?: number | null;
  @ApiProperty({ required: false }) @Expose() cancelledAt?: number | null;
  @ApiProperty({ required: false }) @Expose() cancelledBy?: FoodOrderCancelledBy | null;
  @ApiProperty({ required: false }) @Expose() cancelledReason?: string | null;
  @ApiProperty() @Expose() createdAt!: number;
  @ApiProperty({ type: [FoodOrderItemVo] }) @Expose() items!: FoodOrderItemVo[];
  @ApiProperty({ type: [TimelineEntryVo] }) @Expose() timeline!: TimelineEntryVo[];
  @ApiProperty({ required: false }) @Expose() payment?: FoodOrderPaymentBriefVo | null;
  @ApiProperty({ description: '可点击的下一步动作', type: [String] }) @Expose() actions!: string[];
}

// === T13 cancel ===

export class CancelOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class CancelOrderVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty() @Expose() cancelledAt!: number;
}

// === T14 review ===

export class ReviewOrderDto {
  @ApiProperty({ description: '1-5' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  content?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  images?: string[];
}

export class ReviewOrderVo {
  @ApiProperty() @Expose() reviewId!: string;
  @ApiProperty() @Expose() createdAt!: number;
}
