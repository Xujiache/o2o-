import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ============= 分类 =============

export class CreateCategoryDto {
  @ApiProperty()
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class CategoryVo {
  @ApiProperty()
  categoryId!: string;
  @ApiProperty()
  storeId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  displayOrder!: number;
}

// ============= 商品 =============

export class SkuDto {
  @ApiProperty({ example: '{"size":"L","color":"red"}' })
  @IsString()
  @Length(1, 255)
  specValue!: string;

  @ApiProperty({ example: 1500, description: '价格(分)' })
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  stock!: number;
}

export class ListProductsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false, enum: ['draft', 'on_shelf', 'off_shelf', 'sold_out'] })
  @IsOptional()
  @IsIn(['draft', 'on_shelf', 'off_shelf', 'sold_out'])
  saleStatus?: 'draft' | 'on_shelf' | 'off_shelf' | 'sold_out';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageNo?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  coverImageFileId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ description: '0=无规格 / 1=多规格' })
  @IsInt()
  @Min(0)
  @Max(1)
  hasSku!: number;

  @ApiProperty({ required: false, description: '无 SKU 时使用,单位分' })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false, description: '无 SKU 时使用' })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockAlertThreshold?: number;

  @ApiProperty({ required: false, type: [SkuDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SkuDto)
  skus?: SkuDto[];

  @ApiProperty({ enum: ['draft', 'on_shelf'], default: 'draft' })
  @IsOptional()
  @IsIn(['draft', 'on_shelf'])
  saleStatus?: 'draft' | 'on_shelf';
}

export class UpdateProductDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageFileId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockAlertThreshold?: number;
}

export class CreateProductVo {
  @ApiProperty()
  productId!: string;
  @ApiProperty()
  saleStatus!: string;
  @ApiProperty()
  createdAt!: number;
}

export class ProductItemVo {
  @ApiProperty()
  productId!: string;
  @ApiProperty()
  storeId!: string;
  @ApiProperty()
  categoryId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  price!: string;
  @ApiProperty()
  stock!: number;
  @ApiProperty()
  saleStatus!: string;
  @ApiProperty()
  hasSku!: number;
  @ApiProperty({ required: false })
  coverImageFileId?: string | null;

  @ApiProperty({ required: false, description: '封面图 presigned URL,fileId 反查 file_object 拼装' })
  imageUrl?: string | null;
}

export class ProductPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [ProductItemVo] })
  list!: ProductItemVo[];
}

export class SaleStatusDto {
  @ApiProperty({ enum: ['on_shelf', 'off_shelf'] })
  @IsIn(['on_shelf', 'off_shelf'])
  saleStatus!: 'on_shelf' | 'off_shelf';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchSaleStatusDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds!: string[];

  @ApiProperty({ enum: ['on_shelf', 'off_shelf'] })
  @IsIn(['on_shelf', 'off_shelf'])
  saleStatus!: 'on_shelf' | 'off_shelf';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SaleStatusVo {
  @ApiProperty()
  productId!: string;
  @ApiProperty()
  saleStatus!: string;
  @ApiProperty()
  updatedAt!: number;
}
