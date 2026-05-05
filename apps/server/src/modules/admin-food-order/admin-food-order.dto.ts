import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

import type {
  FoodOrderCancelledBy,
  FoodOrderPayStatus,
  FoodOrderStatus,
} from '../../database/entities/food-order.entity';
import type { OrderTimelineActorType } from '../../database/entities/order-timeline.entity';

export class AdminListFoodOrdersQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: FoodOrderStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(0, 16) cityCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() payChannel?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() customerId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() storeId?: string;
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

export class AdminFoodOrderListItemVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty() @Expose() payStatus!: FoodOrderPayStatus;
  @ApiProperty() @Expose() customerId!: string;
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() cityCode!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() expireAt!: number;
  @ApiProperty() @Expose() createdAt!: number;
}

export class AdminFoodOrderListPageVo {
  @ApiProperty() @Expose() pageNo!: number;
  @ApiProperty() @Expose() pageSize!: number;
  @ApiProperty() @Expose() total!: number;
  @ApiProperty({ type: [AdminFoodOrderListItemVo] }) @Expose() list!: AdminFoodOrderListItemVo[];
}

export class AdminTimelineEntryVo {
  @ApiProperty({ required: false }) @Expose() fromStatus?: FoodOrderStatus | null;
  @ApiProperty() @Expose() toStatus!: FoodOrderStatus;
  @ApiProperty() @Expose() actorType!: OrderTimelineActorType;
  @ApiProperty({ required: false }) @Expose() reason?: string | null;
  @ApiProperty() @Expose() createdAt!: number;
}

export class AdminPaymentBriefVo {
  @ApiProperty() @Expose() payOrderId!: string;
  @ApiProperty() @Expose() payOrderNo!: string;
  @ApiProperty() @Expose() payChannel!: string;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty({ required: false }) @Expose() channelTradeNo?: string | null;
  @ApiProperty({ required: false }) @Expose() paidAt?: number | null;
}

export class AdminFoodOrderDetailVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() status!: FoodOrderStatus;
  @ApiProperty() @Expose() payStatus!: FoodOrderPayStatus;
  @ApiProperty() @Expose() customerId!: string;
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() cityCode!: string;
  @ApiProperty() @Expose() goodsAmount!: string;
  @ApiProperty() @Expose() deliveryFee!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() expireAt!: number;
  @ApiProperty({ required: false }) @Expose() paidAt?: number | null;
  @ApiProperty({ required: false }) @Expose() cancelledAt?: number | null;
  @ApiProperty({ required: false }) @Expose() cancelledBy?: FoodOrderCancelledBy | null;
  @ApiProperty({ required: false }) @Expose() cancelledReason?: string | null;
  // Stage 7 — 商家履约时间字段(扩展)
  @ApiProperty({ required: false }) @Expose() acceptedAt?: number | null;
  @ApiProperty({ required: false }) @Expose() expectedReadyAt?: number | null;
  @ApiProperty({ required: false }) @Expose() readyAt?: number | null;
  @ApiProperty({ required: false }) @Expose() rejectReason?: string | null;
  @ApiProperty() @Expose() createdAt!: number;
  @ApiProperty({ type: [AdminTimelineEntryVo] }) @Expose() timeline!: AdminTimelineEntryVo[];
  @ApiProperty({ required: false }) @Expose() payment?: AdminPaymentBriefVo | null;
}

export class AdminTimelineStatsVo {
  @ApiProperty({ description: '15 分钟未支付订单数' }) @Expose() waitPayOverdueCount!: number;
  @ApiProperty({ description: '商家 10 分钟未接单' }) @Expose() merchantAcceptOverdueCount!: number;
  @ApiProperty({ description: '配送中订单数' }) @Expose() deliveringCount!: number;
  @ApiProperty({ description: '今日已完成数' }) @Expose() completedTodayCount!: number;
  @ApiProperty({ description: '今日取消数' }) @Expose() cancelledTodayCount!: number;
}
