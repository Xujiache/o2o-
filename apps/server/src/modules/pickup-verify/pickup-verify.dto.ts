import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class VerifyPickupDto {
  @ApiProperty({ required: false, description: '6 位提货码(手输)' })
  @IsOptional()
  @IsString()
  @Length(6, 8)
  pickupCode?: string;

  @ApiProperty({ required: false, description: '扫码 payload: PICKUP:<orderNo>:<code>' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  qrPayload?: string;
}

export class VerifiedOrderItemVo {
  @ApiProperty() groceryOrderItemId!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() pricingMode!: 'fixed' | 'weighed';
  @ApiProperty({ nullable: true }) weightUnit!: 'jin' | 'kg' | 'g' | null;
  @ApiProperty() unitPrice!: string;
  @ApiProperty() estimatedQuantity!: number;
  @ApiProperty({ nullable: true }) actualQuantity!: number | null;
  @ApiProperty() estimatedSubtotal!: string;
  @ApiProperty({ nullable: true }) actualSubtotal!: string | null;
}

export class VerifyPickupVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() orderNo!: string;
  @ApiProperty() status!: string;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() pickupDate!: string;
  @ApiProperty() pickupStartMinute!: number;
  @ApiProperty() pickupEndMinute!: number;
  @ApiProperty({ description: '是否含称重待录入项' }) needsWeighing!: boolean;
  @ApiProperty({ type: [VerifiedOrderItemVo] }) items!: VerifiedOrderItemVo[];
  @ApiProperty() estimatedPayableAmount!: string;
  @ApiProperty({ nullable: true }) finalPayableAmount!: string | null;
}

export class VerifyLogsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() pickupPointId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() fromDate?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() toDate?: string;
  @ApiProperty({ required: false, enum: ['1', '0'] }) @IsOptional() @IsIn(['1', '0']) result?: '1' | '0';
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class VerifyLogVo {
  @ApiProperty() verifyLogId!: string;
  @ApiProperty({ nullable: true }) groceryOrderId!: string | null;
  @ApiProperty() orderNo!: string;
  @ApiProperty() pickupPointId!: string;
  @ApiProperty() operatorId!: string;
  @ApiProperty({ nullable: true }) operatorName!: string | null;
  @ApiProperty() verifyMethod!: number;
  @ApiProperty() result!: number;
  @ApiProperty({ nullable: true }) failReason!: string | null;
  @ApiProperty() createdAt!: number;
}

export class VerifyLogsPageVo {
  @ApiProperty({ type: [VerifyLogVo] }) items!: VerifyLogVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
