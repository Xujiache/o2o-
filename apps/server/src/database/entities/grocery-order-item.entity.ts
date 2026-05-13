import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ProductPricingMode, ProductWeightUnit } from './product.entity';

@Entity('grocery_order_item')
@Index('idx_grocery_order_item_order', ['groceryOrderId'])
@Index('idx_grocery_order_item_product', ['productId'])
export class GroceryOrderItem {
  @PrimaryGeneratedColumn({ name: 'grocery_order_item_id', type: 'bigint' })
  groceryOrderItemId!: string;

  @Column({ name: 'grocery_order_id', type: 'bigint' })
  groceryOrderId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'sku_id', type: 'bigint', nullable: true })
  skuId!: string | null;

  @Column({ name: 'product_name', type: 'varchar', length: 128 })
  productName!: string;

  @Column({ name: 'cover_image_file_id', type: 'varchar', length: 64, nullable: true })
  coverImageFileId!: string | null;

  @Column({
    name: 'pricing_mode',
    type: 'enum',
    enum: ['fixed', 'weighed'],
  })
  pricingMode!: ProductPricingMode;

  @Column({ name: 'weight_unit', type: 'varchar', length: 8, nullable: true })
  weightUnit!: ProductWeightUnit | null;

  @Column({ name: 'unit_price', type: 'bigint' })
  unitPrice!: string;

  @Column({ name: 'estimated_quantity', type: 'int' })
  estimatedQuantity!: number;

  @Column({ name: 'actual_quantity', type: 'int', nullable: true })
  actualQuantity!: number | null;

  @Column({ name: 'estimated_subtotal', type: 'bigint' })
  estimatedSubtotal!: string;

  @Column({ name: 'actual_subtotal', type: 'bigint', nullable: true })
  actualSubtotal!: string | null;

  @Column({ name: 'weighed_at', type: 'bigint', nullable: true })
  weighedAt!: string | null;

  @Column({ name: 'weighed_by', type: 'bigint', nullable: true })
  weighedBy!: string | null;
}
