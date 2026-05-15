import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  GROCERY_DELIVERY_METHODS,
  GROCERY_PRICE_DISPLAY_RULES,
  GROCERY_PRICED_BY,
  type GroceryDeliveryMethod,
  type GroceryPriceDisplayRule,
  type GroceryPricedBy,
} from '../../database/entities/grocery-product.entity';

export const PRODUCT_SALE_STATUSES = ['on_shelf', 'off_shelf', 'sold_out'] as const;
export type ProductSaleStatus = (typeof PRODUCT_SALE_STATUSES)[number];

export const CATEGORY_STATUSES = ['active', 'inactive'] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const GROCERY_MAX_MAIN_IMAGES = 10;
export const GROCERY_MAX_DETAIL_IMAGES = 20;
export const GROCERY_MAX_TAGS = 8;
export const GROCERY_MAX_SKUS = 30;

/** ==== 分类(公开) ==== */

export class GroceryCategoryVo {
  @ApiProperty() @Expose() categoryId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() iconFileId?: string | null;
  @ApiProperty() @Expose() displayOrder!: number;
  @ApiProperty() @Expose() status!: CategoryStatus;
}

export class ListGroceryCategoriesVo {
  @ApiProperty({ type: [GroceryCategoryVo] })
  list!: GroceryCategoryVo[];
}

/** ==== 分类(admin) ==== */

export class CreateGroceryCategoryDto {
  @ApiProperty({ example: '禽类' })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  iconFileId?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ required: false, enum: CATEGORY_STATUSES, default: 'active' })
  @IsOptional()
  @IsEnum(CATEGORY_STATUSES)
  status?: CategoryStatus;
}

export class UpdateGroceryCategoryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 64) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() iconFileId?: string | null;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) displayOrder?: number;
  @ApiProperty({ required: false, enum: CATEGORY_STATUSES })
  @IsOptional()
  @IsEnum(CATEGORY_STATUSES)
  status?: CategoryStatus;
}

export class CategoryMutationVo {
  @ApiProperty() categoryId!: string;
  @ApiProperty() updatedAt!: string;
}

/** ==== 商品(公开/c 端) ==== */

export class PublicListGroceryProductsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

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
  @Max(100)
  pageSize?: number;
}

/** ==== SKU(GR-6) ==== */

export class GroceryProductSkuItemDto {
  @ApiProperty({ required: false, description: '编辑已有 SKU 时必填' })
  @IsOptional()
  @IsString()
  skuId?: string;

  @ApiProperty({ example: '500g 装' })
  @IsString()
  @Length(1, 64)
  specValue!: string;

  @ApiProperty({ description: '售价(分)', example: 1500 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  priceCents!: number;

  @ApiProperty({ description: '库存(斤或件)', example: 100 })
  @Type(() => Number)
  @Min(0)
  stockJin!: number;

  @ApiProperty({ required: false, description: '每份预估克数(可选)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  weightGrams?: number;

  @ApiProperty({ required: false, description: '展示顺序,小者在前' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class PublicGrocerySkuVo {
  @ApiProperty() @Expose() skuId!: string;
  @ApiProperty() @Expose() specValue!: string;
  @ApiProperty({ description: '售价(分)' }) @Expose() priceCents!: string;
  @ApiProperty({ description: '库存(斤或件)' }) @Expose() stockJin!: string;
  @ApiProperty({ required: false }) @Expose() weightGrams?: number | null;
  @ApiProperty() @Expose() displayOrder!: number;
}

export class PublicGroceryProductVo {
  @ApiProperty() @Expose() productId!: string;
  @ApiProperty() @Expose() categoryId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() coverImageFileId?: string | null;
  @ApiProperty({ required: false, type: [String] }) @Expose() mainImageFileIds?: string[] | null;
  @ApiProperty({ required: false, type: [String] }) @Expose() detailImageFileIds?: string[] | null;
  @ApiProperty({ required: false, type: [String], description: '后端已解析为可访问 URL,前端直接渲染' })
  @Expose()
  mainImageUrls!: string[];
  @ApiProperty({ required: false, type: [String], description: '后端已解析为可访问 URL,前端直接渲染' })
  @Expose()
  detailImageUrls!: string[];
  @ApiProperty({ required: false, description: '兼容旧封面 URL,优先用 mainImageUrls[0]' })
  @Expose()
  coverImageUrl?: string | null;
  @ApiProperty({ required: false }) @Expose() description?: string | null;
  @ApiProperty({ required: false, type: [String], description: '商品标签' }) @Expose() tags?: string[] | null;
  @ApiProperty() @Expose() isWeighted!: number;
  @ApiProperty({ enum: GROCERY_PRICED_BY, description: '定价模式' }) @Expose() pricedBy!: GroceryPricedBy;
  @ApiProperty({ description: '单价:分/斤(weight) 或 单价:分/件(piece)' }) @Expose() unitPriceCentsPerJin!: string;
  @ApiProperty({ description: '每份预估克数' }) @Expose() estimatedWeightGrams!: number;
  @ApiProperty({ description: '剩余库存(斤或件)' }) @Expose() stockJin!: string;
  @ApiProperty({ required: false, type: [String], enum: GROCERY_DELIVERY_METHODS, description: '物流方式多选' })
  @Expose()
  deliveryMethods?: GroceryDeliveryMethod[] | null;
  @ApiProperty({ enum: GROCERY_PRICE_DISPLAY_RULES }) @Expose() priceDisplayRule!: GroceryPriceDisplayRule;
  @ApiProperty({ required: false, description: '区间最低价(分),仅 SKU 商品+区间显示有值' })
  @Expose()
  priceFromCents?: string | null;
  @ApiProperty({ required: false, description: '区间最高价(分)' }) @Expose() priceToCents?: string | null;
  @ApiProperty({ type: [PublicGrocerySkuVo] }) @Expose() skus!: PublicGrocerySkuVo[];
  @ApiProperty() @Expose() saleStatus!: ProductSaleStatus;
  @ApiProperty({ description: '1=需绑定一鸡一码二维码' }) @Expose() hasTraceability!: number;
}

export class PublicListGroceryProductsVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [PublicGroceryProductVo] })
  list!: PublicGroceryProductVo[];
}

/** ==== 商品(运营员/admin 写) ==== */

export class CreateGroceryProductDto {
  @ApiProperty()
  @IsString()
  categoryId!: string;

  @ApiProperty({ example: '土鸡(散养)' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  coverImageFileId?: string;

  @ApiProperty({ required: false, type: [String], description: '主图 fileId 数组,最多 10 张' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_MAIN_IMAGES)
  @IsString({ each: true })
  mainImageFileIds?: string[];

  @ApiProperty({ required: false, type: [String], description: '详情图 fileId 数组,最多 20 张' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_DETAIL_IMAGES)
  @IsString({ each: true })
  detailImageFileIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, type: [String], description: '商品标签,最多 8 个,每个 <=16 字' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_TAGS)
  @IsString({ each: true })
  @Length(1, 16, { each: true })
  tags?: string[];

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isWeighted?: boolean;

  @ApiProperty({ required: false, enum: GROCERY_PRICED_BY, default: 'weight', description: '定价模式' })
  @IsOptional()
  @IsEnum(GROCERY_PRICED_BY)
  pricedBy?: GroceryPricedBy;

  @ApiProperty({ description: '单价:分/斤(weight) 或 单价:分/件(piece);sku 模式可传 0 占位', example: 3500 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  unitPriceCentsPerJin!: number;

  @ApiProperty({ required: false, description: '每份预估克数', default: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  estimatedWeightGrams?: number;

  @ApiProperty({ required: false, description: '初始库存(斤或件)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  initialStockJin?: number;

  @ApiProperty({
    required: false,
    type: [String],
    enum: GROCERY_DELIVERY_METHODS,
    description: '物流方式多选',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(GROCERY_DELIVERY_METHODS, { each: true })
  deliveryMethods?: GroceryDeliveryMethod[];

  @ApiProperty({
    required: false,
    enum: GROCERY_PRICE_DISPLAY_RULES,
    default: 'starting',
    description: '价格显示规则',
  })
  @IsOptional()
  @IsEnum(GROCERY_PRICE_DISPLAY_RULES)
  priceDisplayRule?: GroceryPriceDisplayRule;

  @ApiProperty({
    required: false,
    type: [GroceryProductSkuItemDto],
    description: '规格 SKU 列表(priced_by=sku 时必填),最多 30 条',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_SKUS)
  @ValidateNested({ each: true })
  @Type(() => GroceryProductSkuItemDto)
  skus?: GroceryProductSkuItemDto[];

  @ApiProperty({ required: false, enum: PRODUCT_SALE_STATUSES, default: 'on_shelf' })
  @IsOptional()
  @IsEnum(PRODUCT_SALE_STATUSES)
  saleStatus?: ProductSaleStatus;

  @ApiProperty({ required: false, default: false, description: '是否需绑一鸡一码二维码' })
  @IsOptional()
  @IsBoolean()
  hasTraceability?: boolean;
}

export class UpdateGroceryProductDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() categoryId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 128) name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() coverImageFileId?: string | null;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_MAIN_IMAGES)
  @IsString({ each: true })
  mainImageFileIds?: string[];
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_DETAIL_IMAGES)
  @IsString({ each: true })
  detailImageFileIds?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_TAGS)
  @IsString({ each: true })
  @Length(1, 16, { each: true })
  tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isWeighted?: boolean;
  @ApiProperty({ required: false, enum: GROCERY_PRICED_BY })
  @IsOptional()
  @IsEnum(GROCERY_PRICED_BY)
  pricedBy?: GroceryPricedBy;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() @Min(0) unitPriceCentsPerJin?: number;
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50000)
  estimatedWeightGrams?: number;
  @ApiProperty({ required: false, type: [String], enum: GROCERY_DELIVERY_METHODS })
  @IsOptional()
  @IsArray()
  @IsEnum(GROCERY_DELIVERY_METHODS, { each: true })
  deliveryMethods?: GroceryDeliveryMethod[];
  @ApiProperty({ required: false, enum: GROCERY_PRICE_DISPLAY_RULES })
  @IsOptional()
  @IsEnum(GROCERY_PRICE_DISPLAY_RULES)
  priceDisplayRule?: GroceryPriceDisplayRule;
  @ApiProperty({ required: false, type: [GroceryProductSkuItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(GROCERY_MAX_SKUS)
  @ValidateNested({ each: true })
  @Type(() => GroceryProductSkuItemDto)
  skus?: GroceryProductSkuItemDto[];
  @ApiProperty({ required: false, enum: PRODUCT_SALE_STATUSES })
  @IsOptional()
  @IsEnum(PRODUCT_SALE_STATUSES)
  saleStatus?: ProductSaleStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() hasTraceability?: boolean;
}

export class ShelfActionDto {
  @ApiProperty({ enum: ['on_shelf', 'off_shelf'] })
  @IsEnum(['on_shelf', 'off_shelf'])
  action!: 'on_shelf' | 'off_shelf';
}

export class AdjustStockDto {
  @ApiProperty({ description: '入库(正)或出库(负)斤数,如 100 = +100斤,-30 = -30斤', example: 100 })
  @Type(() => Number)
  @IsInt()
  deltaJin!: number;

  @ApiProperty({ required: false, description: '原因/备注' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  reason?: string;
}

export class ProductMutationVo {
  @ApiProperty() productId!: string;
  @ApiProperty() updatedAt!: string;
}

export class AdminListGroceryProductsQueryDto extends PublicListGroceryProductsQueryDto {
  @ApiProperty({ required: false, enum: PRODUCT_SALE_STATUSES })
  @IsOptional()
  @IsEnum(PRODUCT_SALE_STATUSES)
  saleStatus?: ProductSaleStatus;
}

export class AdminGroceryProductVo extends PublicGroceryProductVo {
  @ApiProperty() @Expose() createdAt!: string;
  @ApiProperty() @Expose() updatedAt!: string;
}

export class AdminListGroceryProductsVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [AdminGroceryProductVo] })
  list!: AdminGroceryProductVo[];

  /** 列表中常用的分类映射,key=categoryId */
  @ApiProperty({ required: false, description: 'categoryId 到 name 的映射' })
  @IsArray()
  categoryNames?: Record<string, string>;
}
