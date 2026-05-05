import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class ListCitiesQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  serviceEnabled?: boolean;

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

export class CityItemVo {
  @ApiProperty()
  @Expose()
  cityCode!: string;

  @ApiProperty()
  @Expose()
  cityName!: string;

  @ApiProperty({ required: false })
  @Expose()
  province?: string | null;

  @ApiProperty()
  @Expose()
  serviceEnabled!: boolean;

  @ApiProperty({ required: false, description: 'GeoJSON Polygon,可空' })
  @Expose()
  serviceArea?: unknown;

  @ApiProperty()
  @Expose()
  displayOrder!: number;

  @ApiProperty()
  @Expose()
  updatedAt!: string;
}

export class CityListPageVo {
  @ApiProperty()
  pageNo!: number;
  @ApiProperty()
  pageSize!: number;
  @ApiProperty()
  total!: number;
  @ApiProperty({ type: [CityItemVo] })
  list!: CityItemVo[];
}

export class CreateCityDto {
  @ApiProperty({ example: 'BJ' })
  @IsString()
  @Length(2, 16)
  @Matches(/^[A-Z0-9_]{2,16}$/, { message: 'cityCode 只能含大写字母数字下划线 2-16 位' })
  cityCode!: string;

  @ApiProperty({ example: '北京' })
  @IsString()
  @Length(1, 64)
  cityName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  province?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  serviceEnabled?: boolean;

  @ApiProperty({ required: false, description: 'GeoJSON Polygon,可空(NULL=全城开放)' })
  @IsOptional()
  @IsObject()
  serviceArea?: unknown;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class UpdateCityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  cityName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  province?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  serviceEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  serviceArea?: unknown;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  displayOrder?: number;
}

export class CityMutationVo {
  @ApiProperty()
  cityCode!: string;
  @ApiProperty()
  cityId!: string;
  @ApiProperty()
  updatedAt!: string;
}
