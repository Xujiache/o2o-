import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

import type { ProductPricingMode, ProductWeightUnit } from '../../database/entities';

export class ListGroceryProductsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() keyword?: string;
  @ApiProperty({ required: false, enum: ['sales', 'price_asc', 'price_desc', 'new'] })
  @IsOptional()
  @IsIn(['sales', 'price_asc', 'price_desc', 'new'])
  sort?: 'sales' | 'price_asc' | 'price_desc' | 'new';
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class GroceryProductItemVo {
  @ApiProperty() productId!: string;
  @ApiProperty() storeId!: string;
  @ApiProperty() categoryId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) coverImageFileId!: string | null;
  @ApiProperty() pricingMode!: ProductPricingMode;
  @ApiProperty({ nullable: true }) weightUnit!: ProductWeightUnit | null;
  @ApiProperty({ description: 'fixed: 售价(分/份);weighed: 该字段为 0,看 unitPricePerJin' })
  price!: string;
  @ApiProperty({ nullable: true, description: '每斤价(分),称重商品用' })
  unitPricePerJin!: string | null;
  @ApiProperty({ nullable: true }) minWeightG!: number | null;
  @ApiProperty({ nullable: true }) maxWeightG!: number | null;
  @ApiProperty() stock!: number;
  @ApiProperty() sales!: number;
}

export class GroceryProductDetailVo extends GroceryProductItemVo {
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty({ type: [String], nullable: true }) images!: string[] | null;
}

export class GroceryProductPageVo {
  @ApiProperty({ type: [GroceryProductItemVo] }) items!: GroceryProductItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class UpsertGroceryProductDto {
  @ApiProperty() @IsString() categoryId!: string;
  @ApiProperty() @IsString() @Length(1, 128) name!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() coverImageFileId?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  images?: string[];
  @ApiProperty({ enum: ['fixed', 'weighed'] }) @IsIn(['fixed', 'weighed']) pricingMode!: ProductPricingMode;
  @ApiProperty({ description: 'fixed: 售价(分/份)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
  @ApiProperty({ description: 'weighed: 每斤价(分)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPricePerJin?: number;
  @ApiProperty({ required: false, enum: ['jin', 'kg', 'g'] })
  @IsOptional()
  @IsIn(['jin', 'kg', 'g'])
  weightUnit?: ProductWeightUnit;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) minWeightG?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) maxWeightG?: number;
  @ApiProperty() @IsInt() @Min(0) stock!: number;
}

export class GroceryShelfDto {
  @ApiProperty({ enum: ['on_shelf', 'off_shelf'] })
  @IsIn(['on_shelf', 'off_shelf'])
  saleStatus!: 'on_shelf' | 'off_shelf';
}
