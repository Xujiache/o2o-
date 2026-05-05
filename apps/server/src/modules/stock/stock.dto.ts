import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class StockAlertItemVo {
  @ApiProperty()
  productId!: string;
  @ApiProperty()
  storeId!: string;
  @ApiProperty()
  productName!: string;
  @ApiProperty()
  currentStock!: number;
  @ApiProperty()
  threshold!: number;
}

export class SetThresholdDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  threshold!: number;
}
