import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class QueryCityDto {
  @ApiPropertyOptional({ description: '关键词(城市名/code 模糊)' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '是否仅返回开通服务的城市' })
  @IsOptional()
  @IsBooleanString()
  @Transform(({ value }: { value: unknown }) =>
    value === undefined ? undefined : String(value).toLowerCase() === 'true',
  )
  enabled?: boolean;
}

export class CityVo {
  @ApiProperty() cityCode!: string;
  @ApiProperty() cityName!: string;
  @ApiProperty({ required: false, nullable: true }) province?: string | null;
  @ApiProperty() serviceEnabled!: boolean;
}

export class QueryHealthDto {
  @ApiPropertyOptional({ description: 'provider 过滤', example: 'minio' })
  @IsOptional()
  @IsString()
  provider?: string;
}

export class IntegrationHealthVo {
  @ApiProperty() provider!: string;
  @ApiProperty() status!: 'active' | 'disabled' | 'error';
  @ApiProperty({ required: false, nullable: true }) lastCheckedAt?: number | null;
  @ApiProperty({ required: false, nullable: true }) errorMessage?: string | null;
}
