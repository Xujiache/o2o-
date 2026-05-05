import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PlatformCategoryBizType = 'takeaway' | 'errand';

@Entity('platform_category')
@Index('uk_platform_category', ['bizType', 'parentId', 'name'], { unique: true })
@Index('idx_platform_category_listing', ['bizType', 'enabled', 'displayOrder'])
export class PlatformCategory {
  @PrimaryGeneratedColumn({ name: 'category_id', type: 'bigint' })
  categoryId!: string;

  @Column({ name: 'biz_type', type: 'varchar', length: 16 })
  bizType!: PlatformCategoryBizType;

  @Column({ name: 'parent_id', type: 'bigint', default: 0 })
  parentId!: string;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ name: 'icon_url', type: 'varchar', length: 512, nullable: true })
  iconUrl!: string | null;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder!: number;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
