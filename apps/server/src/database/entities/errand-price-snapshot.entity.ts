import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('errand_price_snapshot')
@Index('uk_errand_price_snapshot_order', ['errandOrderId'], { unique: true })
export class ErrandPriceSnapshot {
  @PrimaryGeneratedColumn({ name: 'errand_price_snapshot_id', type: 'bigint' })
  errandPriceSnapshotId!: string;

  @Column({ name: 'errand_order_id', type: 'bigint' })
  errandOrderId!: string;

  @Column({ name: 'quote_id', type: 'bigint' })
  quoteId!: string;

  @Column({ type: 'json' })
  payload!: Record<string, unknown>;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
