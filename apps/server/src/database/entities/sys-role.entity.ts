import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type RoleScope = 'admin' | 'merchant' | 'rider' | 'customer';

@Entity('sys_role')
export class SysRole {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'enum', enum: ['admin', 'merchant', 'rider', 'customer'] })
  scope!: RoleScope;

  @Column({ type: 'tinyint', default: 1 })
  enabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
