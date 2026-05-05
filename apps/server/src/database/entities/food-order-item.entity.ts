import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export interface FoodOrderItemSkuSnapshot {
  name: string;
  price: number;
  spec?: string | null;
  iconUrl?: string | null;
  productName?: string;
}

@Entity('food_order_item')
@Index('idx_food_order_item_order', ['foodOrderId'])
@Index('idx_food_order_item_sku', ['skuId'])
export class FoodOrderItem {
  @PrimaryGeneratedColumn({ name: 'food_order_item_id', type: 'bigint' })
  foodOrderItemId!: string;

  @Column({ name: 'food_order_id', type: 'bigint' })
  foodOrderId!: string;

  @Column({ name: 'sku_id', type: 'bigint' })
  skuId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'sku_snapshot', type: 'json' })
  skuSnapshot!: FoodOrderItemSkuSnapshot;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice!: string;

  @Column({ name: 'sub_total', type: 'bigint' })
  subTotal!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
