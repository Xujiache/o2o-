import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import type { ErrandOrderTypeCode } from '../../database/entities';

export class GetErrandTypesQueryDto {
  @ApiPropertyOptional({ description: '城市编码(预留扩展)', example: 'GLOBAL' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  cityCode?: string;
}

export class ErrandTypeVo {
  @ApiProperty({ description: '类型编码', enum: ['BUY', 'DELIVER', 'HELP', 'CUSTOM'] })
  typeCode!: ErrandOrderTypeCode;

  @ApiProperty({ description: '名称' })
  name!: string;

  @ApiProperty({ description: '必填字段列表', isArray: true, type: String })
  requiredFields!: string[];

  @ApiProperty({ description: '描述' })
  description!: string;

  @ApiProperty({ description: '是否启用,1=启用 0=禁用' })
  enabled!: number;

  @ApiProperty({ description: '排序' })
  sort!: number;
}

export class ErrandTypeListVo {
  @ApiProperty({ description: '跑腿类型列表', type: [ErrandTypeVo] })
  list!: ErrandTypeVo[];
}
