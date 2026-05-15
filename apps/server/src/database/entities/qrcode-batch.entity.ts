import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 二维码批次(GR-5)
 *
 * admin 一键生成 N 个 blank 二维码时记录,便于后续按批次导出/管理。
 */
@Entity('qrcode_batch')
@Index('idx_qrcode_batch_created', ['createdAt'])
export class QrcodeBatch {
  @PrimaryGeneratedColumn({ name: 'batch_id', type: 'bigint' })
  batchId!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ name: 'total_count', type: 'int' })
  totalCount!: number;

  @Column({ name: 'generated_by', type: 'bigint', nullable: true })
  generatedBy!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
