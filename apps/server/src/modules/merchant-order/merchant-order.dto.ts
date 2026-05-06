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
