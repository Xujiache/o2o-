import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('trace_batch')
@Index('uk_trace_batch_no', ['batchNo'], { unique: true })
@Index('idx_trace_batch_product', ['productId'])
export class TraceBatch {
  @PrimaryGeneratedColumn({ name: 'trace_batch_id', type: 'bigint' })
  traceBatchId!: string;

  @Column({ name: 'batch_no', type: 'varchar', length: 32 })
  batchNo!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'total_count', type: 'int' })
  totalCount!: number;

  @Column({ name: 'produced_at', type: 'bigint' })
  producedAt!: string;

  @Column({ name: 'shelf_life_days', type: 'int', nullable: true })
  shelfLifeDays!: number | null;

  @Column({ name: 'supplier_name', type: 'varchar', length: 128, nullable: true })
  supplierName!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  status!: number;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
