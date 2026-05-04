import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class QueryDictDto {
  @ApiPropertyOptional({ description: '字典类型,逗号分隔', example: 'order_takeaway_status,city' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string')
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (Array.isArray(value)) return value;
    return undefined;
  })
  typeList?: string[];
}

export class DictItemVo {
  @ApiProperty() dictType!: string;
  @ApiProperty() code!: string;
  @ApiProperty() label!: string;
  @ApiProperty() sort!: number;
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ required: false, nullable: true }) remark?: string | null;
}
