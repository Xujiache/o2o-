import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ApplyAfterSaleDto {
  @ApiProperty({ description: '订单 ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: '售后类型', enum: ['REFUND', 'EXCHANGE'] })
  @IsString()
  @IsIn(['REFUND', 'EXCHANGE'])
  type!: 'REFUND' | 'EXCHANGE';

  @ApiProperty({ description: '原因' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  reason!: string;

  @ApiProperty({ description: '退款金额(分)' })
  @IsInt()
  @Min(0)
  amountCents!: number;

  @ApiProperty({ required: false, type: [String], description: '凭证文件 IDs' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  evidenceFileIds?: string[];
}

export class ApplyAfterSaleVo {
  @ApiProperty() afterSaleId!: string;
  @ApiProperty() status!: string;
  @ApiProperty() appliedAt!: number;
}
