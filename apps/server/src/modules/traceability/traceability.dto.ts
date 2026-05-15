import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';

export const ARCHIVE_STATUSES = ['draft', 'active', 'sold'] as const;
export type ArchiveStatus = (typeof ARCHIVE_STATUSES)[number];

export const QRCODE_STATUSES = ['blank', 'bound', 'sold', 'voided'] as const;
export type QrcodeStatus = (typeof QRCODE_STATUSES)[number];

export class VaccineRecordDto {
  @ApiProperty({ example: '禽流感疫苗' })
  @IsString()
  @Length(1, 64)
  name!: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsString()
  @Length(1, 32)
  date!: string;
}

export class CreateArchiveDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: '2026-Q1-BATCH-A001' })
  @IsString()
  @Length(1, 64)
  batchNo!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  farmName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  farmAddress?: string;

  @ApiProperty({ required: false, description: '出生/孵化日期 (ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  breedDate?: number;

  @ApiProperty({ required: false, description: '出栏/屠宰日期 (ms)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  slaughterDate?: number;

  @ApiProperty({ required: false, description: '出栏重量(g)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  weightGrams?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  quarantineCertNo?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  veterinarian?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  feedType?: string;

  @ApiProperty({ required: false, type: [VaccineRecordDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VaccineRecordDto)
  vaccineRecords?: VaccineRecordDto[];

  @ApiProperty({ required: false, enum: ARCHIVE_STATUSES, default: 'active' })
  @IsOptional()
  @IsEnum(ARCHIVE_STATUSES)
  status?: ArchiveStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateArchiveDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() productId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 64) batchNo?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() farmName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() farmAddress?: string;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() breedDate?: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() slaughterDate?: number;
  @ApiProperty({ required: false }) @IsOptional() @Type(() => Number) @IsInt() weightGrams?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() quarantineCertNo?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() veterinarian?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() feedType?: string;
  @ApiProperty({ required: false, type: [VaccineRecordDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VaccineRecordDto)
  vaccineRecords?: VaccineRecordDto[];
  @ApiProperty({ required: false, enum: ARCHIVE_STATUSES })
  @IsOptional()
  @IsEnum(ARCHIVE_STATUSES)
  status?: ArchiveStatus;
  @ApiProperty({ required: false }) @IsOptional() @IsString() remark?: string;
}

export class ListArchivesQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() keyword?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() productId?: string;
  @ApiProperty({ required: false, enum: ARCHIVE_STATUSES })
  @IsOptional()
  @IsEnum(ARCHIVE_STATUSES)
  status?: ArchiveStatus;
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ArchiveVo {
  @ApiProperty() @Expose() archiveId!: string;
  @ApiProperty({ required: false }) @Expose() productId?: string | null;
  @ApiProperty() @Expose() batchNo!: string;
  @ApiProperty({ required: false }) @Expose() farmName?: string | null;
  @ApiProperty({ required: false }) @Expose() farmAddress?: string | null;
  @ApiProperty({ required: false }) @Expose() breedDate?: string | null;
  @ApiProperty({ required: false }) @Expose() slaughterDate?: string | null;
  @ApiProperty({ required: false }) @Expose() weightGrams?: number | null;
  @ApiProperty({ required: false }) @Expose() quarantineCertNo?: string | null;
  @ApiProperty({ required: false }) @Expose() veterinarian?: string | null;
  @ApiProperty({ required: false }) @Expose() feedType?: string | null;
  @ApiProperty({ required: false }) @Expose() vaccineRecords?: unknown;
  @ApiProperty() @Expose() status!: ArchiveStatus;
  @ApiProperty({ required: false }) @Expose() remark?: string | null;
  @ApiProperty() @Expose() createdAt!: string;
  @ApiProperty() @Expose() updatedAt!: string;
}

export class ListArchivesVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [ArchiveVo] })
  list!: ArchiveVo[];
}

export class ArchiveMutationVo {
  @ApiProperty() archiveId!: string;
  @ApiProperty() updatedAt!: string;
}

/** ====== 二维码 ====== */

export class GenerateBatchDto {
  @ApiProperty({ example: '2026-04-A' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ description: '本批生成数量,≤1000', example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  count!: number;
}

export class BatchVo {
  @ApiProperty() @Expose() batchId!: string;
  @ApiProperty() @Expose() name!: string;
  @ApiProperty() @Expose() totalCount!: number;
  @ApiProperty({ required: false }) @Expose() generatedBy?: string | null;
  @ApiProperty() @Expose() createdAt!: string;
}

export class BatchGenerationResultVo {
  @ApiProperty() batchId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() totalCount!: number;
  @ApiProperty({ type: [String], description: '本批生成的 code 列表' })
  codes!: string[];
}

export class ListBatchesQueryDto {
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ListBatchesVo {
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ type: [BatchVo] })
  list!: BatchVo[];
}

export class QrcodeVo {
  @ApiProperty() @Expose() qrcodeId!: string;
  @ApiProperty() @Expose() code!: string;
  @ApiProperty({ required: false }) @Expose() archiveId?: string | null;
  @ApiProperty() @Expose() status!: QrcodeStatus;
  @ApiProperty() @Expose() generatedBatchId!: string;
  @ApiProperty() @Expose() generatedAt!: string;
  @ApiProperty({ required: false }) @Expose() boundAt?: string | null;
  @ApiProperty({ required: false }) @Expose() soldAt?: string | null;
  @ApiProperty({ required: false }) @Expose() soldOrderId?: string | null;
}

export class ListBatchCodesVo {
  @ApiProperty() batchId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [QrcodeVo] })
  codes!: QrcodeVo[];
}

export class BindArchiveDto {
  @ApiProperty({ description: '档案 ID' })
  @IsString()
  archiveId!: string;
}

export class BindResultVo {
  @ApiProperty() qrcodeId!: string;
  @ApiProperty() code!: string;
  @ApiProperty() archiveId!: string;
  @ApiProperty() status!: QrcodeStatus;
}

export class PublicTraceVo {
  @ApiProperty() code!: string;
  @ApiProperty() status!: QrcodeStatus;
  @ApiProperty({ required: false }) archive?: ArchiveVo | null;
}
