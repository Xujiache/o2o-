import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import type { ErrandOrderTypeCode } from './errand-order.entity';

@Entity('errand_type')
@Index('uk_errand_type_code', ['typeCode'], { unique: true })
@Index('idx_errand_type_enabled', ['enabled', 'sort'])
export class ErrandType {
  @PrimaryGeneratedColumn({ name: 'errand_type_id', type: 'bigint' })
  errandTypeId!: string;

  @Column({ name: 'type_code', type: 'varchar', length: 16 })
  typeCode!: ErrandOrderTypeCode;

  @Column({ type: 'varchar', length: 32 })
  name!: string;

  @Column({ name: 'required_fields', type: 'json' })
  requiredFields!: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
