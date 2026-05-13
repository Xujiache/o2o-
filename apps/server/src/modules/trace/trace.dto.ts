import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// ============= Batch =============

export class CreateTraceBatchDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiProperty() @IsString() @Length(1, 32) batchNo!: string;
  @ApiProperty({ description: '本批数量 1-10000' }) @IsInt() @Min(1) @Max(10000) totalCount!: number;
  @ApiProperty({ description: '生产日期 epoch ms' }) @IsInt() producedAt!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() @Min(1) shelfLifeDays?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() supplierName?: string;
}

export class TraceBatchVo {
  @ApiProperty() traceBatchId!: string;
  @ApiProperty() batchNo!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() totalCount!: number;
  @ApiProperty() producedAt!: number;
  @ApiProperty({ nullable: true }) shelfLifeDays!: number | null;
  @ApiProperty({ nullable: true }) supplierName!: string | null;
  @ApiProperty() status!: number;
  @ApiProperty() createdAt!: number;
  @ApiProperty({ required: false, description: '已生成 QR 数' }) generatedCount?: number;
}

export class ListBatchesQueryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() productId?: string;
  @ApiProperty({ required: false, default: 1 }) @IsOptional() @IsInt() @Min(1) pageNo?: number;
  @ApiProperty({ required: false, default: 20 }) @IsOptional() @IsInt() @Min(1) pageSize?: number;
}

export class BatchListPageVo {
  @ApiProperty({ type: [TraceBatchVo] }) items!: TraceBatchVo[];
  @ApiProperty() total!: number;
  @ApiProperty() pageNo!: number;
  @ApiProperty() pageSize!: number;
}

// ============= QR =============

export class GenerateQrcodesDto {
  @ApiProperty() @IsInt() @Min(1) @Max(10000) count!: number;
}

export class GenerateQrcodesVo {
  @ApiProperty() taskId!: string;
  @ApiProperty() traceBatchId!: string;
  @ApiProperty() requested!: number;
  @ApiProperty({ enum: ['queued', 'running', 'done', 'failed'] })
  status!: 'queued' | 'running' | 'done' | 'failed';
  @ApiProperty({ description: '已完成数' }) progress!: number;
  @ApiProperty({ nullable: true }) errorMessage!: string | null;
}

export class QrLookupVo {
  @ApiProperty() traceQrId!: string;
  @ApiProperty() qrCode!: string;
  @ApiProperty() traceBatchId!: string;
  @ApiProperty() batchNo!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() productName!: string;
  @ApiProperty() serialNo!: number;
  @ApiProperty() status!: number;
  @ApiProperty() scanCount!: number;
  @ApiProperty({ nullable: true }) firstScanAt!: number | null;
}

// ============= Record =============

export class TraceAttachmentDto {
  @ApiProperty({ enum: ['image', 'pdf', 'video', 'file'] })
  @IsIn(['image', 'pdf', 'video', 'file'])
  type!: 'image' | 'pdf' | 'video' | 'file';
  @ApiProperty() @IsString() fileId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() url?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
}

export class CreateTraceRecordDto {
  @ApiProperty() @IsString() traceBatchId!: string;
  @ApiProperty({ required: false, description: '若指定则节点仅对单个 QR 生效' })
  @IsOptional()
  @IsString()
  traceQrId?: string;
  @ApiProperty({ description: '1产地 2加工 3检测 4仓储 5物流 6上架 7其他' })
  @IsInt()
  @Min(1)
  @Max(7)
  nodeType!: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  @ApiProperty() @IsString() @Length(1, 64) nodeTitle!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ required: false, type: [TraceAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TraceAttachmentDto)
  attachments?: TraceAttachmentDto[];
  @ApiProperty() @IsInt() happenedAt!: number;
}

export class UpdateTraceRecordDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() @Length(1, 64) nodeTitle?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() content?: string;
  @ApiProperty({ required: false, type: [TraceAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => TraceAttachmentDto)
  attachments?: TraceAttachmentDto[];
  @ApiProperty({ required: false }) @IsOptional() @IsInt() happenedAt?: number;
}

export class TraceRecordVo {
  @ApiProperty() traceRecordId!: string;
  @ApiProperty({ nullable: true }) traceQrId!: string | null;
  @ApiProperty() traceBatchId!: string;
  @ApiProperty() nodeType!: number;
  @ApiProperty() nodeTitle!: string;
  @ApiProperty({ nullable: true }) content!: string | null;
  @ApiProperty({ nullable: true, type: [TraceAttachmentDto] }) attachments!: TraceAttachmentDto[] | null;
  @ApiProperty() happenedAt!: number;
  @ApiProperty({ nullable: true }) operatorName!: string | null;
  @ApiProperty() createdAt!: number;
}

// ============= Customer Scan =============

export class CustomerTraceInfoVo {
  @ApiProperty()
  product!: { productId: string; name: string; coverImageFileId: string | null; productType: string };
  @ApiProperty()
  batch!: {
    traceBatchId: string;
    batchNo: string;
    producedAt: number;
    shelfLifeDays: number | null;
    supplierName: string | null;
  };
  @ApiProperty()
  qr!: { traceQrId: string; qrCode: string; scanCount: number; firstScanAt: number | null };
  @ApiProperty({ type: [TraceRecordVo] }) records!: TraceRecordVo[];
}
