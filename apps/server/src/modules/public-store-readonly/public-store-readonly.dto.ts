import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListPublicStoresQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cityCode?: string;

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

export class PublicStoreItemVo {
  @ApiProperty()
  storeId!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty({ required: false })
  avatarFileId?: string | null;
  @ApiProperty()
  businessScope!: string;
  @ApiProperty()
  minOrderAmount!: string;
  @ApiProperty()
  deliveryFee!: string;
}

export class PublicStorePageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [PublicStoreItemVo] })
  list!: PublicStoreItemVo[];
}

export class PublicStoreDetailVo extends PublicStoreItemVo {
  @ApiProperty({ required: false })
  intro?: string | null;
  @ApiProperty({ required: false })
  notice?: string | null;
  @ApiProperty()
  businessHours!: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export class PublicProductItemVo {
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
  @ApiProperty({ required: false })
  coverImageFileId?: string | null;
}

export class PublicProductPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [PublicProductItemVo] })
  list!: PublicProductItemVo[];
}

export class ListPublicProductsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  categoryId?: string;

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
