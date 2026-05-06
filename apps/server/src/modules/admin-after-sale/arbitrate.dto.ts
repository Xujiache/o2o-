import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ArbitrateDto {
  @ApiProperty() @IsIn(['MERCHANT', 'RIDER', 'CUSTOMER', 'PLATFORM']) responsibleParty!:
    | 'MERCHANT'
    | 'RIDER'
    | 'CUSTOMER'
    | 'PLATFORM';
  @ApiProperty() @IsIn(['APPROVE', 'REJECT', 'PARTIAL']) decision!: 'APPROVE' | 'REJECT' | 'PARTIAL';
  @ApiProperty() @IsString() refundAmount!: string;
  @ApiProperty() @IsString() penalty!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remark?: string;
}

export class ArbitrateVo {
  @ApiProperty() afterSaleId!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) refundOrderId!: string | null;
}
