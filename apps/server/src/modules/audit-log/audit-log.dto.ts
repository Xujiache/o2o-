import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ description: '主体类型(customer/merchant/rider/admin/system/public)' })
  @IsOptional()
  @IsString()
  operatorType?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() targetType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() targetId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() traceId?: string;

  @ApiPropertyOptional({ description: '起始毫秒时间戳' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startAt?: number;

  @ApiPropertyOptional({ description: '结束毫秒时间戳' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endAt?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNo: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 20;
}

export class AuditLogVo {
  @ApiProperty() id!: string;
  @ApiProperty() traceId!: string;
  @ApiProperty() operatorType!: string;
  @ApiProperty({ required: false, nullable: true }) operatorId!: string | null;
  @ApiProperty() targetType!: string;
  @ApiProperty({ required: false, nullable: true }) targetId!: string | null;
  @ApiProperty({ required: false, nullable: true }) beforeStatus!: string | null;
  @ApiProperty({ required: false, nullable: true }) afterStatus!: string | null;
  @ApiProperty({ required: false, nullable: true }) ip!: string | null;
  @ApiProperty({ required: false, nullable: true }) summary!: string | null;
  @ApiProperty({ required: false, nullable: true }) detailRef!: string | null;
  @ApiProperty() createdAt!: number;
}

export class AuditLogPageVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [AuditLogVo] }) list!: AuditLogVo[];
}
