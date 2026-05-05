import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_category')
@Index('idx_store_order', ['storeId', 'displayOrder'])
export class ProductCategory {
  @PrimaryGeneratedColumn({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
