import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 生鲜商品规格 SKU(GR-6)
 *
 * - 仅当 grocery_product.priced_by = 'sku' 时使用,一个商品对应多条 SKU
 * - spec_value: 规格文案(如「500g 装」「整鸡」「中份」),与 (product_id) 唯一
 * - price_cents: 单 SKU 售价(分),整数
 * - stock_jin: 库存,与商品总库存语义对齐(可为整数件数,decimal 保留两位适配按重量场景)
 * - weight_grams: 可选,SKU 维度参考重量(用于按斤模式 fallback 展示)
 */
@Entity('grocery_product_sku')
@Index('idx_grocery_product_sku_product', ['productId'])
@Index('uk_grocery_product_sku', ['productId', 'specValue'], { unique: true })
export class GroceryProductSku {
  @PrimaryGeneratedColumn({ name: 'sku_id', type: 'bigint' })
  skuId!: string;

  @Column({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'spec_value', type: 'varchar', length: 255 })
  specValue!: string;

  /** 售价:分 */
  @Column({ name: 'price_cents', type: 'bigint' })
  priceCents!: string;

  /** 库存(斤或件,DECIMAL 10,2) */
  @Column({ name: 'stock_jin', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockJin!: string;

  @Column({ name: 'weight_grams', type: 'int', nullable: true })
  weightGrams!: number | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
