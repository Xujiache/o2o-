import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RiskExceptionsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() exceptionType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bizType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class RiskExceptionItemVo {
  @ApiProperty() logId!: string;
  @ApiProperty() exceptionType!: string;
  @ApiProperty() bizType!: string;
  @ApiProperty() bizOrderId!: string;
  @ApiProperty() severity!: string;
  @ApiProperty({ nullable: true }) description!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) handlerAdminId!: string | null;
  @ApiProperty({ nullable: true }) handledAt!: number | null;
  @ApiProperty() createdAt!: number;
}

export class RiskExceptionsListVo {
  @ApiProperty({ type: [RiskExceptionItemVo] }) items!: RiskExceptionItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
