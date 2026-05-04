import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type LoginDevicePlatform = 'mp-weixin' | 'app-android' | 'app-ios' | 'h5';
export type LoginDeviceStatus = 'active' | 'revoked';

@Entity('login_device')
@Index('idx_user_status', ['userId', 'status'])
@Index('idx_refresh', ['refreshTokenHash'])
@Index('idx_anomaly', ['userId', 'loginAt'])
export class LoginDevice {
  @PrimaryGeneratedColumn({ name: 'login_id', type: 'bigint' })
  loginId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'device_id', type: 'varchar', length: 64 })
  deviceId!: string;

  @Column({ type: 'enum', enum: ['mp-weixin', 'app-android', 'app-ios', 'h5'] })
  platform!: LoginDevicePlatform;

  @Column({ name: 'login_ip', type: 'varchar', length: 45, nullable: true })
  loginIp!: string | null;

  @Column({ name: 'login_city', type: 'varchar', length: 50, nullable: true })
  loginCity!: string | null;

  @Column({ name: 'refresh_token_hash', type: 'char', length: 64 })
  refreshTokenHash!: string;

  @Column({ name: 'login_at', type: 'bigint' })
  loginAt!: string;

  @Column({ name: 'last_active_at', type: 'bigint' })
  lastActiveAt!: string;

  @Column({ type: 'enum', enum: ['active', 'revoked'], default: 'active' })
  status!: LoginDeviceStatus;
}
