import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class StatisticsQueryDto {
  @ApiProperty({ required: false, enum: ['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'] })
  @IsOptional()
  @IsString()
  @IsIn(['TODAY', 'YESTERDAY', 'WEEK', 'MONTH'])
  range?: 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH';
}

export class TopItemVo {
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() qty!: number;
  @ApiProperty() grossCents!: string;
}

export class StatisticsVo {
  @ApiProperty() range!: string;
  @ApiProperty() orderCount!: number;
  @ApiProperty() grossCents!: string;
  @ApiProperty() refundCents!: string;
  @ApiProperty() netCents!: string;
  @ApiProperty() storeRating!: string;
  @ApiProperty({ type: [TopItemVo] }) topItems!: TopItemVo[];
}
