import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PushDevicePrincipalType = 'customer' | 'merchant' | 'rider';
export type PushDevicePlatform = 'ios' | 'android' | 'wxmp';
export type PushDeviceAppType = 'customer' | 'merchant' | 'rider';

@Entity('push_device')
@Index('uk_push_device_token', ['deviceToken', 'principalType'], { unique: true })
@Index('idx_push_device_principal', ['principalType', 'principalId'])
export class PushDevice {
  @PrimaryGeneratedColumn({ name: 'push_device_id', type: 'bigint' })
  pushDeviceId!: string;

  @Column({ name: 'device_token', type: 'varchar', length: 255 })
  deviceToken!: string;

  @Column({ name: 'principal_type', type: 'varchar', length: 16 })
  principalType!: PushDevicePrincipalType;

  @Column({ name: 'principal_id', type: 'bigint' })
  principalId!: string;

  @Column({ type: 'varchar', length: 16 })
  platform!: PushDevicePlatform;

  @Column({ name: 'app_type', type: 'varchar', length: 16 })
  appType!: PushDeviceAppType;

  @Column({ name: 'push_enabled', type: 'tinyint', default: 1 })
  pushEnabled!: number;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
