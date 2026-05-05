import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cart_item')
@Index('uk_cart_unique', ['customerId', 'storeId', 'skuId'], { unique: true })
@Index('idx_cart_customer_store', ['customerId', 'storeId'])
export class CartItem {
  @PrimaryGeneratedColumn({ name: 'cart_item_id', type: 'bigint' })
  cartItemId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId!: string;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
