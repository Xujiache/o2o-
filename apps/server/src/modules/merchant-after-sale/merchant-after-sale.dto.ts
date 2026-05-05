import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class MerchantAfterSaleQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class ReviewAfterSaleDto {
  @ApiProperty({ description: '审核结果', enum: ['APPROVE', 'REJECT'] })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  reviewResult!: 'APPROVE' | 'REJECT';

  @ApiProperty({ required: false, description: '驳回原因(REJECT 时必填)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  rejectReason?: string;

  @ApiProperty({ required: false, type: [String], description: '商家凭证文件 IDs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  evidenceFileIds?: string[];
}

export class MerchantAfterSaleListItemVo {
  @ApiProperty() afterSaleId!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() reason!: string;
  @ApiProperty() amountCents!: string;
  @ApiProperty() status!: string;
  @ApiProperty() appliedAt!: number;
  @ApiProperty() createdAt!: number;
}

export class MerchantAfterSaleListVo {
  @ApiProperty({ type: [MerchantAfterSaleListItemVo] }) items!: MerchantAfterSaleListItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class ReviewAfterSaleVo {
  @ApiProperty() afterSaleId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() nextHandler!: string;
}
