import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type ProhibitedItemLevel = 'WARN' | 'REJECT';

@Entity('prohibited_item')
@Index('uk_prohibited_item_keyword', ['keyword'], { unique: true })
@Index('idx_prohibited_item_enabled', ['enabled'])
export class ProhibitedItem {
  @PrimaryGeneratedColumn({ name: 'prohibited_item_id', type: 'bigint' })
  prohibitedItemId!: string;

  @Column({ type: 'varchar', length: 64 })
  keyword!: string;

  @Column({ type: 'varchar', length: 32 })
  category!: string;

  @Column({ type: 'varchar', length: 16, default: 'WARN' })
  level!: ProhibitedItemLevel;

  @Column({ type: 'varchar', length: 255 })
  description!: string;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
