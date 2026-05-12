import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length } from 'class-validator';

export class GetFoodHomeQueryDto {
  @ApiProperty({ description: '城市 code,如 BJ / SH' })
  @IsString()
  @Length(2, 16)
  cityCode!: string;

  @ApiProperty({ required: false, description: '经度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;

  @ApiProperty({ required: false, description: '纬度' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;
}

export class FoodHomeBannerVo {
  @ApiProperty() @Expose() imageUrl!: string;
  @ApiProperty({ required: false }) @Expose() linkUrl?: string;
  @ApiProperty() @Expose() displayOrder!: number;
}

export class FoodHomeCategoryVo {
  @ApiProperty() @Expose() categoryId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() iconUrl?: string | null;
}

export class FoodHomeRecommendedStoreVo {
  @ApiProperty() @Expose() storeId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty({ required: false }) @Expose() iconUrl?: string | null;
  @ApiProperty({ description: '距离(米),无 lng/lat 时返 null' }) @Expose() distance!: number | null;
  @ApiProperty({ description: '近 30 天销量,本阶段 mock=0' }) @Expose() sales!: number;
  @ApiProperty({ description: '评分 0-5,本阶段 mock=5.0' }) @Expose() rating!: number;
  @ApiProperty({ description: '配送费(分)' }) @Expose() deliveryFee!: string;
  @ApiProperty({ description: '起送金额(分)' }) @Expose() minOrderAmount!: string;
  @ApiProperty({ description: '营业状态 online/offline/paused' }) @Expose() businessStatus!: string;
  @ApiProperty() @Expose() statusUpdatedAt!: number;
}

export class FoodHomeVo {
  @ApiProperty() @Expose() cityCode!: string;
  @ApiProperty({ type: [FoodHomeBannerVo] }) @Expose() banners!: FoodHomeBannerVo[];
  @ApiProperty({ type: [FoodHomeCategoryVo] }) @Expose() categories!: FoodHomeCategoryVo[];
  @ApiProperty({ type: [Object], description: '活动入口,本阶段返空数组' }) @Expose() activityEntries!: unknown[];
  @ApiProperty({ type: [FoodHomeRecommendedStoreVo] })
  @Expose()
  recommendedStores!: FoodHomeRecommendedStoreVo[];
}
