import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sys_config')
export class SysConfig {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'config_key', type: 'varchar', length: 128, unique: true })
  configKey!: string;

  @Column({ name: 'config_value', type: 'text' })
  configValue!: string;

  @Column({ type: 'varchar', length: 32, default: 'global' })
  scope!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description!: string | null;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
