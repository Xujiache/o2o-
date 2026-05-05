import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

const BIZ_TYPES = ['takeaway', 'errand'] as const;
type BizType = (typeof BIZ_TYPES)[number];

export class ListCategoriesQueryDto {
  @ApiProperty({ enum: BIZ_TYPES })
  @IsIn(BIZ_TYPES as readonly string[])
  bizType!: BizType;
}

export class CategoryItemVo {
  @ApiProperty()
  @Expose()
  categoryId!: string;

  @ApiProperty({ enum: BIZ_TYPES })
  @Expose()
  bizType!: BizType;

  @ApiProperty()
  @Expose()
  parentId!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false })
  @Expose()
  iconUrl?: string | null;

  @ApiProperty()
  @Expose()
  displayOrder!: number;

  @ApiProperty()
  @Expose()
  enabled!: boolean;

  @ApiProperty({ type: () => [CategoryItemVo], required: false })
  @Expose()
  children?: CategoryItemVo[];
}

export class CategoryTreeVo {
  @ApiProperty({ enum: BIZ_TYPES })
  bizType!: BizType;

  @ApiProperty({ type: [CategoryItemVo] })
  list!: CategoryItemVo[];
}

export class CreateCategoryDto {
  @ApiProperty({ enum: BIZ_TYPES })
  @IsIn(BIZ_TYPES as readonly string[])
  bizType!: BizType;

  @ApiProperty({ required: false, default: '0', description: '0=顶级 / >0=二级' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ example: '快餐便当' })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  iconUrl?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
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
  @IsString()
  @Length(1, 512)
  iconUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CategoryMutationVo {
  @ApiProperty()
  categoryId!: string;
  @ApiProperty()
  updatedAt!: string;
}
