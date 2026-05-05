import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AdminUserStatus = 'active' | 'disabled';

@Entity('admin_user')
@Index('uk_admin_user_username', ['username'], { unique: true })
@Index('idx_admin_user_status', ['status'])
export class AdminUser {
  @PrimaryGeneratedColumn({ name: 'admin_user_id', type: 'bigint' })
  adminUserId!: string;

  @Column({ type: 'varchar', length: 64 })
  username!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 128 })
  passwordHash!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 128, nullable: true })
  displayName!: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'disabled'],
    default: 'active',
  })
  status!: AdminUserStatus;

  @Column({ name: 'role_codes', type: 'json' })
  roleCodes!: string[];

  @Column({ name: 'login_failed_count', type: 'int', default: 0 })
  loginFailedCount!: number;

  @Column({ name: 'locked_until', type: 'bigint', default: 0 })
  lockedUntil!: string;

  @Column({ name: 'last_login_at', type: 'bigint', default: 0 })
  lastLoginAt!: string;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
