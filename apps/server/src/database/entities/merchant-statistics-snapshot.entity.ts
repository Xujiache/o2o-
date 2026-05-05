import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface TopItem {
  productId: string;
  productName: string;
  qty: number;
  grossCents: string;
}

@Entity('merchant_statistics_snapshot')
@Index('uk_merchant_stat_store_date', ['storeId', 'snapshotDate'], { unique: true })
@Index('idx_merchant_stat_date', ['snapshotDate'])
export class MerchantStatisticsSnapshot {
  @PrimaryGeneratedColumn({ name: 'merchant_statistics_snapshot_id', type: 'bigint' })
  merchantStatisticsSnapshotId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'snapshot_date', type: 'int' })
  snapshotDate!: number;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount!: number;

  @Column({ name: 'gross_cents', type: 'bigint', default: 0 })
  grossCents!: string;

  @Column({ name: 'refund_cents', type: 'bigint', default: 0 })
  refundCents!: string;

  @Column({ name: 'net_cents', type: 'bigint', default: 0 })
  netCents!: string;

  @Column({ name: 'top_items_json', type: 'json', nullable: true })
  topItemsJson!: TopItem[] | null;

  @Column({ name: 'store_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  storeRating!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
