import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sys_error_code')
export class SysErrorCode {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ name: 'i18n_zh', type: 'varchar', length: 255 })
  i18nZh!: string;

  @Column({ name: 'i18n_en', type: 'varchar', length: 255, nullable: true })
  i18nEn!: string | null;

  @Column({ type: 'varchar', length: 16 })
  level!: 'info' | 'warn' | 'error';

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
