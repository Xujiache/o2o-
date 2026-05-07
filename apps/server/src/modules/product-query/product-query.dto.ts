import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

import type { PromoRules, PromoType } from '../../database/entities/merchant-promotion.entity';
import type { ProductSaleStatus } from '../../database/entities/product.entity';

export class FoodSkuVo {
  @ApiProperty() @Expose() skuId!: string;
  @ApiProperty() @Expose() specValue!: string;
  @ApiProperty({ description: '价格(分)' }) @Expose() price!: string;
  @ApiProperty({ description: '可售库存 = stock - stock_locked' }) @Expose() availableStock!: number;
}

export class FoodProductVo {
  @ApiProperty() @Expose() productId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() description?: string | null;
  @ApiProperty({ required: false }) @Expose() coverImageFileId?: string | null;
  @ApiProperty({ required: false, description: '封面图 presigned URL' }) @Expose() imageUrl?: string | null;
  @ApiProperty({ description: '基础价格(分),无 sku 时取此' }) @Expose() basePrice!: string;
  @ApiProperty({ required: false }) @Expose() originalPrice?: string | null;
  @ApiProperty() @Expose() saleStatus!: ProductSaleStatus;
  @ApiProperty() @Expose() categoryId!: string;
  @ApiProperty({ type: [FoodSkuVo] }) @Expose() skus!: FoodSkuVo[];
}

export class FoodProductCategoryVo {
  @ApiProperty() @Expose() categoryId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty() @Expose() displayOrder!: number;
}

export class FoodPromoVo {
  @ApiProperty() @Expose() promoId!: string;
  @ApiProperty() @Expose() promoType!: PromoType;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ description: 'productIds 适用商品' }) @Expose() productIds!: string[];
  @ApiProperty() @Expose() rules!: PromoRules;
}

export class FoodStoreProductsVo {
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty({ type: [FoodProductCategoryVo] }) @Expose() categories!: FoodProductCategoryVo[];
  @ApiProperty({ type: [FoodProductVo] }) @Expose() products!: FoodProductVo[];
  @ApiProperty({ type: [FoodPromoVo] }) @Expose() promotions!: FoodPromoVo[];
}
