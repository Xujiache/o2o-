import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type StockOperatorType = 'merchant' | 'admin' | 'system';

@Entity('stock_record')
@Index('idx_product_time', ['productId', 'createdAt'])
@Index('idx_sku', ['skuId'])
export class StockRecord {
  @PrimaryGeneratedColumn({ name: 'record_id', type: 'bigint' })
  recordId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'sku_id', type: 'bigint', nullable: true })
  skuId!: string | null;

  @Column({ name: 'quantity_change', type: 'int' })
  quantityChange!: number;

  @Column({ type: 'varchar', length: 64 })
  reason!: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 64 })
  operatorId!: string;

  @Column({ name: 'operator_type', type: 'varchar', length: 20 })
  operatorType!: StockOperatorType;

  @Column({ name: 'stock_before', type: 'int' })
  stockBefore!: number;

  @Column({ name: 'stock_after', type: 'int' })
  stockAfter!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
