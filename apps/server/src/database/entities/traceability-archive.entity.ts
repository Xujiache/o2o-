import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 一鸡一码溯源档案(GR-5)
 *
 * 每只(或每批次)生鲜对应一份档案,售出时绑定到 grocery_order_item.bound_qrcode_ids。
 */
@Entity('traceability_archive')
@Index('idx_trace_archive_product', ['productId'])
@Index('idx_trace_archive_batch', ['batchNo'])
@Index('idx_trace_archive_status', ['status'])
export class TraceabilityArchive {
  @PrimaryGeneratedColumn({ name: 'archive_id', type: 'bigint' })
  archiveId!: string;

  /** 属于哪个 SKU(grocery_product.product_id) */
  @Column({ name: 'product_id', type: 'bigint', nullable: true })
  productId!: string | null;

  @Column({ name: 'batch_no', type: 'varchar', length: 64 })
  batchNo!: string;

  @Column({ name: 'farm_name', type: 'varchar', length: 128, nullable: true })
  farmName!: string | null;

  @Column({ name: 'farm_address', type: 'varchar', length: 255, nullable: true })
  farmAddress!: string | null;

  /** 出生/孵化时间(ms) */
  @Column({ name: 'breed_date', type: 'bigint', nullable: true })
  breedDate!: string | null;

  /** 出栏/屠宰时间(ms) */
  @Column({ name: 'slaughter_date', type: 'bigint', nullable: true })
  slaughterDate!: string | null;

  @Column({ name: 'weight_grams', type: 'int', nullable: true })
  weightGrams!: number | null;

  @Column({ name: 'quarantine_cert_no', type: 'varchar', length: 64, nullable: true })
  quarantineCertNo!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  veterinarian!: string | null;

  @Column({ name: 'feed_type', type: 'varchar', length: 128, nullable: true })
  feedType!: string | null;

  @Column({ name: 'vaccine_records', type: 'json', nullable: true })
  vaccineRecords!: Array<{ name: string; date: string }> | null;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'draft' | 'active' | 'sold';

  @Column({ type: 'text', nullable: true })
  remark!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
