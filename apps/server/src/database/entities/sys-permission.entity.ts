import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PermissionScope = 'admin' | 'merchant' | 'rider' | 'customer' | 'public';
export type PermissionType = 'menu' | 'button' | 'data';

@Entity('sys_permission')
@Index('idx_perm_scope', ['scope'])
@Index('idx_perm_parent', ['parentCode'])
export class SysPermission {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 128, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'enum', enum: ['admin', 'merchant', 'rider', 'customer', 'public'] })
  scope!: PermissionScope;

  @Column({ type: 'enum', enum: ['menu', 'button', 'data'] })
  type!: PermissionType;

  @Column({ name: 'parent_code', type: 'varchar', length: 128, nullable: true })
  parentCode!: string | null;

  @Column({ type: 'int', default: 0 })
  sort!: number;
}
