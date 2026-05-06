import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminDispatchQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() bizType?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class AdminDispatchItemVo {
  @ApiProperty() dispatchTaskId!: string;
  @ApiProperty() bizType!: string;
  @ApiProperty() bizOrderId!: string;
  @ApiProperty({ nullable: true }) bizTaskId!: string | null;
  @ApiProperty({ nullable: true }) acceptedRiderId!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() retryCount!: number;
  @ApiProperty() dispatchedAt!: number;
  @ApiProperty() timeoutAt!: number;
  @ApiProperty({ nullable: true }) completedAt!: number | null;
}

export class AdminDispatchListVo {
  @ApiProperty({ type: [AdminDispatchItemVo] }) items!: AdminDispatchItemVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

export class AdminDispatchDetailVo extends AdminDispatchItemVo {
  @ApiProperty({ type: [String] }) candidateRiderIds!: string[];
}
