import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminRefundsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bizType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bizOrderId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminRefundItemVo {
  @ApiProperty() refundOrderId!: string;
  @ApiProperty() refundNo!: string;
  @ApiProperty() bizType!: string;
  @ApiProperty() bizOrderId!: string;
  @ApiProperty({ nullable: true }) paymentOrderId!: string | null;
  @ApiProperty() amount!: string;
  @ApiProperty() status!: string;
  @ApiProperty() provider!: string;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
  @ApiProperty() createdAt!: number;
  @ApiProperty() updatedAt!: number;
}

export class AdminRefundsListVo {
  @ApiProperty({ type: [AdminRefundItemVo] }) items!: AdminRefundItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
