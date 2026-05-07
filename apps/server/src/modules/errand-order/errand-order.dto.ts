import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import type { ErrandOrderTypeCode, ErrandOrderUrgentLevel } from '../../database/entities/errand-order.entity';
import type { ProhibitedItemLevel } from '../../database/entities/prohibited-item.entity';

export class ErrandAddressDto {
  @ApiProperty() @IsString() @Length(1, 255) address!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 32) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(1, 16) mobile?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
}

export class QuoteErrandDto {
  @ApiProperty({ enum: ['BUY', 'DELIVER', 'HELP', 'CUSTOM'] })
  @IsIn(['BUY', 'DELIVER', 'HELP', 'CUSTOM'])
  typeCode!: ErrandOrderTypeCode;

  @ApiPropertyOptional({ description: '取货地址(BUY/DELIVER 必填,HELP/CUSTOM 可选)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrandAddressDto)
  pickupAddress?: ErrandAddressDto;

  @ApiProperty({ description: '收货/办事地址' })
  @ValidateNested()
  @Type(() => ErrandAddressDto)
  deliveryAddress!: ErrandAddressDto;

  @ApiPropertyOptional({ description: 'kg' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiProperty({ enum: ['standard', 'fast', 'express'], default: 'standard' })
  @IsIn(['standard', 'fast', 'express'])
  urgentLevel!: ErrandOrderUrgentLevel;

  @ApiPropertyOptional({ description: '预算上限,单位:分' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: '预约时间(毫秒),不填即时单' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  reservedTime?: number;

  @ApiPropertyOptional({ description: '物品描述(BUY/DELIVER 必填)' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  itemDesc?: string;

  @ApiPropertyOptional({ description: '任务描述(HELP/CUSTOM 必填)' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  taskDesc?: string;
}

export interface ProhibitedWarningVo {
  keyword: string;
  level: ProhibitedItemLevel;
  description: string;
}

export class QuoteVo {
  @ApiProperty() @Expose() quoteId!: string;
  @ApiProperty({ description: '基础费,单位:分' }) @Expose() baseFee!: string;
  @ApiProperty({ description: '距离费,单位:分' }) @Expose() distanceFee!: string;
  @ApiProperty({ description: '加急费 + 重量费,单位:分' }) @Expose() urgentFee!: string;
  @ApiProperty({ description: '应付,单位:分' }) @Expose() payableAmount!: string;
  @ApiProperty({ description: '过期时间(毫秒)' }) @Expose() expireAt!: number;
  @ApiProperty({ description: '违禁警告' }) @Expose() prohibitedWarnings!: ProhibitedWarningVo[];
  @ApiProperty({ description: '距离米' }) @Expose() distanceMeters!: number;
}

export class SubmitErrandDto {
  @ApiProperty()
  @IsString()
  @Length(1, 32)
  quoteId!: string;

  @ApiProperty({ enum: ['wxpay', 'alipay'] })
  @IsIn(['wxpay', 'alipay'])
  payChannel!: 'wxpay' | 'alipay';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 512)
  remark?: string;

  @ApiPropertyOptional({ description: '附件 fileId 数组' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  attachments?: string[];
}

export class SubmitErrandVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() payOrderId!: string;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() expireAt!: number;
}

export class ListErrandQueryDto {
  @ApiPropertyOptional({
    description: 'tab 筛选: WAIT_PAY / IN_PROGRESS / COMPLETED / CANCELLED',
    enum: ['ALL', 'WAIT_PAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @IsOptional()
  @IsIn(['ALL', 'WAIT_PAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: 'ALL' | 'WAIT_PAY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class ErrandOrderListItemVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() typeCode!: ErrandOrderTypeCode;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() urgentLevel!: ErrandOrderUrgentLevel;
  @ApiProperty() @Expose() pickupAddress!: string | null;
  @ApiProperty() @Expose() deliveryAddress!: string;
  @ApiProperty() @Expose() expireAt!: number;
  @ApiProperty() @Expose() createdAt!: number;
}

export class ErrandOrderListVo {
  @ApiProperty({ type: [ErrandOrderListItemVo] }) @Expose() list!: ErrandOrderListItemVo[];
  @ApiProperty() @Expose() total!: number;
  @ApiProperty() @Expose() page!: number;
  @ApiProperty() @Expose() pageSize!: number;
}

export class ErrandOrderDetailVo extends ErrandOrderListItemVo {
  @ApiProperty() @Expose() baseFee!: string;
  @ApiProperty() @Expose() distanceFee!: string;
  @ApiProperty() @Expose() urgentFee!: string;
  @ApiProperty() @Expose() distanceMeters!: number;
  @ApiProperty() @Expose() weight!: string | null;
  @ApiProperty() @Expose() budget!: string | null;
  @ApiProperty() @Expose() reservedTime!: number | null;
  @ApiProperty() @Expose() itemDesc!: string | null;
  @ApiProperty() @Expose() taskDesc!: string | null;
  @ApiProperty() @Expose() remark!: string | null;
  @ApiProperty() @Expose() pickupAddressDetail!: Record<string, unknown> | null;
  @ApiProperty() @Expose() deliveryAddressDetail!: Record<string, unknown>;
  @ApiProperty() @Expose() attachmentFileIds!: string[];
  @ApiProperty() @Expose() timeline!: ErrandTimelineItemVo[];
  @ApiProperty() @Expose() actions!: string[];
  @ApiProperty() @Expose() rider!: { riderId: string; status: string } | null;
  @ApiProperty() @Expose() paidAt!: number | null;
  /** 取件码 — 仅 DELIVER 类型有,其他类型为 null */
  @ApiProperty({ nullable: true }) @Expose() pickupCode!: string | null;
  /** 收货码 — 全部类型在付款后均有 */
  @ApiProperty({ nullable: true }) @Expose() deliveryCode!: string | null;
}

export class ErrandTimelineItemVo {
  @ApiProperty() @Expose() eventType!: string;
  @ApiProperty() @Expose() createdAt!: number;
  @ApiProperty() @Expose() operator!: string;
  @ApiProperty() @Expose() payload!: Record<string, unknown> | null;
}

export class CancelErrandDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class CancelErrandVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() status!: string;
}

export class UrgentErrandDto {
  @ApiProperty({ enum: ['standard', 'fast', 'express'] })
  @IsIn(['standard', 'fast', 'express'])
  urgentLevel!: ErrandOrderUrgentLevel;

  @ApiProperty({ description: '前端确认的加急费(分),用于防漂移校验' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  confirmFee!: number;
}

export class UrgentErrandVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() urgentFee!: string;
  @ApiProperty() @Expose() urgentLevel!: ErrandOrderUrgentLevel;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() payableAmount!: string;
}

export class RemarkErrandDto {
  @ApiProperty()
  @IsString()
  @Length(1, 500)
  remark!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  attachments?: string[];
}

export class RemarkErrandVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() latestRemark!: string;
  @ApiProperty() @Expose() updatedAt!: number;
}

export class ErrandTrackVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() riderLocation!: { lng: number; lat: number } | null;
  @ApiProperty() @Expose() route!: { totalDistanceMeters: number; etaMs: number } | null;
  @ApiProperty() @Expose() trackPoints!: { lng: number; lat: number; distanceFromStart: number }[];
  @ApiProperty() @Expose() eta!: number | null;
}
