import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ProductSaleStatus = 'draft' | 'on_shelf' | 'off_shelf' | 'sold_out';
export type ProductType = 'food' | 'grocery';
export type ProductPricingMode = 'fixed' | 'weighed';
export type ProductWeightUnit = 'jin' | 'kg' | 'g';

@Entity('product')
@Index('idx_store_status', ['storeId', 'saleStatus'])
@Index('idx_product_category', ['categoryId'])
@Index('idx_alert', ['stock', 'stockAlertThreshold'])
@Index('idx_product_type_status', ['productType', 'saleStatus'])
export class Product {
  @PrimaryGeneratedColumn({ name: 'product_id', type: 'bigint' })
  productId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({
    name: 'product_type',
    type: 'enum',
    enum: ['food', 'grocery'],
    default: 'food',
  })
  productType!: ProductType;

  @Column({
    name: 'pricing_mode',
    type: 'enum',
    enum: ['fixed', 'weighed'],
    default: 'fixed',
  })
  pricingMode!: ProductPricingMode;

  @Column({ name: 'weight_unit', type: 'varchar', length: 8, nullable: true })
  weightUnit!: ProductWeightUnit | null;

  @Column({ name: 'min_weight_g', type: 'int', nullable: true })
  minWeightG!: number | null;

  @Column({ name: 'max_weight_g', type: 'int', nullable: true })
  maxWeightG!: number | null;

  @Column({ name: 'unit_price_per_jin', type: 'bigint', nullable: true })
  unitPricePerJin!: string | null;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'cover_image_file_id', type: 'varchar', length: 64, nullable: true })
  coverImageFileId!: string | null;

  @Column({ type: 'json', nullable: true })
  images!: string[] | null;

  @Column({ type: 'bigint' })
  price!: string;

  @Column({ name: 'original_price', type: 'bigint', nullable: true })
  originalPrice!: string | null;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ name: 'stock_alert_threshold', type: 'int', nullable: true, default: 5 })
  stockAlertThreshold!: number | null;

  @Column({ name: 'has_sku', type: 'tinyint', default: 0 })
  hasSku!: number;

  @Column({
    name: 'sale_status',
    type: 'enum',
    enum: ['draft', 'on_shelf', 'off_shelf', 'sold_out'],
    default: 'draft',
  })
  saleStatus!: ProductSaleStatus;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
