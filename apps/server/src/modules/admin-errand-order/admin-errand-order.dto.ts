import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class AdminListErrandOrdersQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 32)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 32)
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['BUY', 'DELIVER', 'HELP', 'CUSTOM'])
  typeCode?: 'BUY' | 'DELIVER' | 'HELP' | 'CUSTOM';

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

export class AdminErrandOrderListItemVo {
  @ApiProperty() @Expose() orderId!: string;
  @ApiProperty() @Expose() orderNo!: string;
  @ApiProperty() @Expose() customerId!: string;
  @ApiProperty() @Expose() typeCode!: string;
  @ApiProperty() @Expose() status!: string;
  @ApiProperty() @Expose() payableAmount!: string;
  @ApiProperty() @Expose() urgentLevel!: string;
  @ApiProperty() @Expose() createdAt!: number;
  @ApiProperty() @Expose() paidAt!: number | null;
  @ApiProperty() @Expose() cancelledAt!: number | null;
}

export class AdminErrandOrderListPageVo {
  @ApiProperty({ type: [AdminErrandOrderListItemVo] }) @Expose() list!: AdminErrandOrderListItemVo[];
  @ApiProperty() @Expose() total!: number;
  @ApiProperty() @Expose() page!: number;
  @ApiProperty() @Expose() pageSize!: number;
}

export class AdminErrandOrderDetailVo extends AdminErrandOrderListItemVo {
  @ApiProperty() @Expose() pickupAddress!: Record<string, unknown> | null;
  @ApiProperty() @Expose() deliveryAddress!: Record<string, unknown>;
  @ApiProperty() @Expose() itemDesc!: string | null;
  @ApiProperty() @Expose() taskDesc!: string | null;
  @ApiProperty() @Expose() weight!: string | null;
  @ApiProperty() @Expose() distanceMeters!: number;
  @ApiProperty() @Expose() baseFee!: string;
  @ApiProperty() @Expose() distanceFee!: string;
  @ApiProperty() @Expose() urgentFee!: string;
  @ApiProperty() @Expose() reservedTime!: number | null;
  @ApiProperty() @Expose() payOrderId!: string | null;
  @ApiProperty() @Expose() cancelReason!: string | null;
  @ApiProperty() @Expose() timeline!: Array<{
    eventType: string;
    operator: string;
    payload: Record<string, unknown> | null;
    createdAt: number;
  }>;
  @ApiProperty() @Expose() task!: {
    taskId: string;
    riderId: string | null;
    status: string;
    dispatchCount: number;
    priceIncrease: string;
  } | null;
}

export class AdminErrandStatsVo {
  @ApiProperty() @Expose() totalCount!: number;
  @ApiProperty() @Expose() waitPayCount!: number;
  @ApiProperty() @Expose() paidCount!: number;
  @ApiProperty() @Expose() dispatchingCount!: number;
  @ApiProperty() @Expose() assignedCount!: number;
  @ApiProperty() @Expose() deliveredCount!: number;
  @ApiProperty() @Expose() completedCount!: number;
  @ApiProperty() @Expose() cancelledCount!: number;
  @ApiProperty() @Expose() totalAmount!: string;
}
