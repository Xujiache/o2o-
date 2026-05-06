import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminViolationsQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() type?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() riderId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminViolationItemVo {
  @ApiProperty() violationId!: string;
  @ApiProperty() riderId!: string;
  @ApiProperty({ nullable: true }) riderTaskId!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) deductCents!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() reportedAt!: number;
  @ApiProperty({ nullable: true }) decidedAt!: number | null;
  @ApiProperty({ nullable: true }) decision!: string | null;
}

export class AdminViolationsListVo {
  @ApiProperty({ type: [AdminViolationItemVo] }) items!: AdminViolationItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
