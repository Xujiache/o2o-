import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ManualAssignDto {
  @ApiProperty() @IsString() @IsNotEmpty() riderId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reason?: string;
}

export class ManualAssignVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() dispatchStatus!: string;
  @ApiProperty() assignedAt!: number;
}
