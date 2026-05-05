import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
  ValidateNested,
} from 'class-validator';

import type { FoodOrderDeliveryType } from '../../database/entities/food-order.entity';

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
