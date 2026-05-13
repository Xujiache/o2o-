import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type TraceQrStatus = 0 | 1 | 2;

@Entity('trace_qr')
@Index('uk_trace_qr_code', ['qrCode'], { unique: true })
@Index('idx_trace_qr_batch_serial', ['traceBatchId', 'serialNo'])
export class TraceQr {
  @PrimaryGeneratedColumn({ name: 'trace_qr_id', type: 'bigint' })
  traceQrId!: string;

  @Column({ name: 'qr_code', type: 'varchar', length: 64 })
  qrCode!: string;

  @Column({ type: 'char', length: 64 })
  signature!: string;

  @Column({ name: 'trace_batch_id', type: 'bigint' })
  traceBatchId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'serial_no', type: 'int' })
  serialNo!: number;

  @Column({ name: 'qr_image_file_id', type: 'varchar', length: 64, nullable: true })
  qrImageFileId!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  status!: TraceQrStatus;

  @Column({ name: 'first_scan_at', type: 'bigint', nullable: true })
  firstScanAt!: string | null;

  @Column({ name: 'scan_count', type: 'int', default: 0 })
  scanCount!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
