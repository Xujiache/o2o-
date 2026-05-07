import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MerchantTimelineItemVo {
  @ApiProperty() at!: number;
  @ApiProperty({ nullable: true }) fromStatus!: string | null;
  @ApiProperty() toStatus!: string;
  @ApiProperty() actor!: string;
  @ApiProperty({ nullable: true }) reason!: string | null;
}

export class MerchantOrderTimelineVo {
  @ApiProperty({ type: [MerchantTimelineItemVo] }) timeline!: MerchantTimelineItemVo[];
  @ApiProperty() currentStatus!: string;
  @ApiProperty({ type: [String] }) allowedMerchantActions!: string[];
}

export class PendingListQueryDto {
  @ApiProperty({ required: false, description: '页码,默认 1' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, description: '每页大小,默认 20' })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiProperty({
    required: false,
    description: '订单状态过滤,逗号分隔多个;不传时仅返回 PAID_WAIT_MERCHANT(待接单)',
    example: 'MERCHANT_ACCEPTED,PREPARING',
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class AcceptOrderDto {
  @ApiProperty({ required: false, description: '预计出餐分钟数(可选,默认 15)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  expectedReadyMinutes?: number;
}

export class RejectOrderDto {
  @ApiProperty({ description: '拒单原因(必填)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  rejectReason!: string;
}

export class ReadyOrderDto {
  @ApiProperty({ required: false, description: '出餐备注' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  readyRemark?: string;
}

export class MerchantOrderListItemVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() status!: string;
  @ApiProperty() payableAmountCents!: string;
  @ApiProperty({ nullable: true }) userRemark!: string | null;
  @ApiProperty() createdAt!: number;
  @ApiProperty() acceptDeadline!: number;
}

export class MerchantOrderListVo {
  @ApiProperty({ type: [MerchantOrderListItemVo] }) items!: MerchantOrderListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class AcceptOrderVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() acceptedAt!: number;
  @ApiProperty() expectedReadyAt!: number;
}

export class RejectOrderVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() refundStatus!: string;
}

export class ReadyOrderVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() readyAt!: number;
}

export class MerchantOrderItemVo {
  @ApiProperty() skuId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) spec!: string | null;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPriceCents!: string;
  @ApiProperty() subTotalCents!: string;
}

export class MerchantOrderAddressVo {
  @ApiProperty() consignee!: string;
  @ApiProperty() mobileMasked!: string;
  @ApiProperty() detail!: string;
}

export class MerchantOrderDetailVo {
  @ApiProperty() orderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() status!: string;
  @ApiProperty() goodsAmountCents!: string;
  @ApiProperty() deliveryFeeCents!: string;
  @ApiProperty() discountAmountCents!: string;
  @ApiProperty() payableAmountCents!: string;
  @ApiProperty({ nullable: true }) userRemark!: string | null;
  @ApiProperty() createdAt!: number;
  @ApiProperty({ nullable: true }) acceptedAt!: number | null;
  @ApiProperty({ nullable: true }) readyAt!: number | null;
  @ApiProperty({ type: () => MerchantOrderAddressVo, nullable: true }) address!: MerchantOrderAddressVo | null;
  @ApiProperty({ type: [MerchantOrderItemVo] }) items!: MerchantOrderItemVo[];
  @ApiProperty({ type: [MerchantTimelineItemVo] }) timeline!: MerchantTimelineItemVo[];
  @ApiProperty({ type: [String] }) allowedMerchantActions!: string[];
}
