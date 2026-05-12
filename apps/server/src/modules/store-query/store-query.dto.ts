import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export type FoodStoreSort = 'distance' | 'sales' | 'rating' | 'recent';

export class ListStoresQueryDto {
  @ApiProperty({ description: '城市 code,必填' })
  @IsString()
  @Length(2, 16)
  cityCode!: string;

  @ApiProperty({ required: false, description: '关键字(店铺名 / 简介模糊匹配)' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  keyword?: string;

  @ApiProperty({ required: false, description: '平台类目 id(takeaway 顶级)' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, enum: ['distance', 'sales', 'rating', 'recent'], default: 'recent' })
  @IsOptional()
  @IsIn(['distance', 'sales', 'rating', 'recent'])
  sort?: FoodStoreSort;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class FoodStoreItemVo {
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() iconUrl?: string | null;
  @ApiProperty({ required: false }) @Expose() intro?: string | null;
  @ApiProperty({ description: '距离米,无 lng/lat 时 null' }) @Expose() distance!: number | null;
  @ApiProperty({ description: '近 30 天销量,本阶段 mock=0' }) @Expose() sales!: number;
  @ApiProperty({ description: '评分,本阶段 mock=5.0' }) @Expose() rating!: number;
  @ApiProperty() @Expose() deliveryFee!: string;
  @ApiProperty() @Expose() minOrderAmount!: string;
  @ApiProperty() @Expose() businessStatus!: string;
  @ApiProperty() @Expose() statusUpdatedAt!: number;
}

export class FoodStoreListPageVo {
  @ApiProperty() @Expose() pageNo!: number;
  @ApiProperty() @Expose() pageSize!: number;
  @ApiProperty() @Expose() total!: number;
  @ApiProperty({ type: [FoodStoreItemVo] }) @Expose() list!: FoodStoreItemVo[];
}
