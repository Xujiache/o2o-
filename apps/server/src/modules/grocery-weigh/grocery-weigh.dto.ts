import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class WeighItemDto {
  @ApiProperty() @IsString() groceryOrderItemId!: string;
  @ApiProperty({ description: '实际克数(g)' }) @IsInt() @Min(1) actualG!: number;
}

export class WeighItemsDto {
  @ApiProperty() @IsString() groceryOrderId!: string;
  @ApiProperty({ type: [WeighItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => WeighItemDto)
  items!: WeighItemDto[];
}

export class WeighItemResultVo {
  @ApiProperty() groceryOrderItemId!: string;
  @ApiProperty() actualQuantity!: number;
  @ApiProperty() actualSubtotal!: string;
}

export class WeighItemsVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty({ type: [WeighItemResultVo] }) items!: WeighItemResultVo[];
  @ApiProperty() finalGoodsAmount!: string;
  @ApiProperty() finalPayableAmount!: string;
  @ApiProperty({ description: 'final - estimated;正=补付 负=退款 0=无' }) diffAmount!: string;
}

export class ConfirmSettleDto {
  @ApiProperty() @IsString() groceryOrderId!: string;
}

export type SettleAction = 'AUTO_DONE' | 'NEEDS_DIFF_PAY' | 'AUTO_REFUND';

export class ConfirmSettleVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() finalPayableAmount!: string;
  @ApiProperty() diffAmount!: string;
  @ApiProperty({ enum: ['AUTO_DONE', 'NEEDS_DIFF_PAY', 'AUTO_REFUND'] })
  action!: SettleAction;
  @ApiProperty() status!: string;
}

export class FinalizeDto {
  @ApiProperty() @IsString() groceryOrderId!: string;
}

export class FinalizeVo {
  @ApiProperty() groceryOrderId!: string;
  @ApiProperty() status!: string;
}
