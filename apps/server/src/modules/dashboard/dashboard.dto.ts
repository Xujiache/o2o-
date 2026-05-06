import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class DashboardOverviewQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() cityCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() from?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() to?: number;
}

export class DashboardOverviewVo {
  @ApiProperty() gmv!: string;
  @ApiProperty() orderCount!: number;
  @ApiProperty() activeUsers!: number;
  @ApiProperty() onlineRiders!: number;
  @ApiProperty() exceptionOrders!: number;
}
