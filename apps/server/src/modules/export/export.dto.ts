import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateExportDto {
  @ApiProperty() @IsString() exportType!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() queryParams?: Record<string, unknown>;
}

export class ExportTaskVo {
  @ApiProperty() exportTaskId!: string;
  @ApiProperty() exportNo!: string;
  @ApiProperty() exportType!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true }) fileUrl!: string | null;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
  @ApiProperty({ nullable: true }) rowCount!: number | null;
  @ApiProperty() createdAt!: number;
  @ApiProperty() updatedAt!: number;
}
