import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 生鲜分类(GR-2)
 *
 * 与外卖 product_category(店铺下分类)不同,生鲜是平台级全局分类,无 store 概念。
 */
@Entity('grocery_category')
@Index('idx_grocery_category_status', ['status'])
@Index('idx_grocery_category_order', ['displayOrder'])
export class GroceryCategory {
  @PrimaryGeneratedColumn({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'icon_file_id', type: 'bigint', nullable: true })
  iconFileId!: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status!: 'active' | 'inactive';

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
