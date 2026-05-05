import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_sku')
@Index('idx_product', ['productId'])
@Index('uk_product_spec', ['productId', 'specValue'], { unique: true })
export class ProductSku {
  @PrimaryGeneratedColumn({ name: 'sku_id', type: 'bigint' })
  skuId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'spec_value', type: 'varchar', length: 255 })
  specValue!: string;

  @Column({ type: 'bigint' })
  price!: string;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  /** stage 5 加:订单提交后预占的库存数量,callback 成功后扣减 stock 并清零 */
  @Column({ name: 'stock_locked', type: 'int', default: 0 })
  stockLocked!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
