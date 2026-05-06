import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ViolationListQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class ViolationItemVo {
  @ApiProperty() violationId!: string;
  @ApiProperty({ nullable: true }) riderTaskId!: string | null;
  @ApiProperty() type!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ nullable: true }) deductCents!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() reportedAt!: number;
  @ApiProperty({ nullable: true }) decidedAt!: number | null;
  @ApiProperty({ nullable: true }) decision!: string | null;
}

export class ViolationListVo {
  @ApiProperty({ type: [ViolationItemVo] }) items!: ViolationItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}
