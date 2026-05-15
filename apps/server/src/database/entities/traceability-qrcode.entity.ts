import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 二维码主表(GR-5)
 *
 * 一鸡一码:批量生成时 blank;扫码绑档案 → bound;售出 → sold;失效 → voided。
 * code 格式:O2OG-{batch:4}-{item:6}-{checksum:2}(共 16 + 3 横线)
 */
@Entity('traceability_qrcode')
@Index('uk_trace_qrcode_code', ['code'], { unique: true })
@Index('idx_trace_qrcode_archive', ['archiveId'])
@Index('idx_trace_qrcode_batch', ['generatedBatchId'])
@Index('idx_trace_qrcode_status', ['status'])
export class TraceabilityQrcode {
  @PrimaryGeneratedColumn({ name: 'qrcode_id', type: 'bigint' })
  qrcodeId!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ name: 'archive_id', type: 'bigint', nullable: true })
  archiveId!: string | null;

  @Column({ type: 'varchar', length: 32, default: 'blank' })
  status!: 'blank' | 'bound' | 'sold' | 'voided';

  @Column({ name: 'generated_batch_id', type: 'bigint' })
  generatedBatchId!: string;

  @Column({ name: 'generated_at', type: 'bigint' })
  generatedAt!: string;

  @Column({ name: 'bound_at', type: 'bigint', nullable: true })
  boundAt!: string | null;

  @Column({ name: 'sold_at', type: 'bigint', nullable: true })
  soldAt!: string | null;

  @Column({ name: 'sold_order_id', type: 'bigint', nullable: true })
  soldOrderId!: string | null;
}
