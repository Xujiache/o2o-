import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StockLockStatus = 'active' | 'released' | 'consumed';

@Entity('stock_lock')
@Index('idx_stock_lock_sku', ['skuId'])
@Index('idx_stock_lock_order', ['orderId'])
@Index('idx_stock_lock_status_created', ['status', 'createdAt'])
export class StockLock {
  @PrimaryGeneratedColumn({ name: 'stock_lock_id', type: 'bigint' })
  stockLockId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'varchar', length: 16, default: 'active' })
  status!: StockLockStatus;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'released_at', type: 'bigint', nullable: true })
  releasedAt!: string | null;
}
