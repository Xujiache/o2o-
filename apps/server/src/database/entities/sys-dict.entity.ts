import { Column, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('sys_dict')
@Unique('uk_dict_type_code', ['dictType', 'code'])
@Index('idx_dict_type', ['dictType'])
export class SysDict {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'dict_type', type: 'varchar', length: 64 })
  dictType!: string;

  @Column({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'int', default: 0 })
  sort!: number;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  remark!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
