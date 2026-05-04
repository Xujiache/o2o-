import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('sys_role_permission')
@Index('idx_rp_permission', ['permissionId'])
export class SysRolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'bigint' })
  roleId!: string;

  @PrimaryColumn({ name: 'permission_id', type: 'bigint' })
  permissionId!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
