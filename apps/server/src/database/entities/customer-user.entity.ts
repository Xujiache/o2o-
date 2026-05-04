import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type CustomerAccountStatus = 'active' | 'disabled';
export type CustomerRealnameStatus = 'unverified' | 'pending' | 'verified' | 'failed';
export type CustomerRegisterSource = 'mobile' | 'wechat';

@Entity('customer_user')
@Index('idx_mobile', ['mobile'])
@Index('idx_wechat_open_id', ['wechatOpenId'])
@Index('idx_status', ['accountStatus', 'realnameStatus'])
export class CustomerUser {
  @PrimaryGeneratedColumn({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({ name: 'wechat_open_id', type: 'varchar', length: 64, nullable: true })
  wechatOpenId!: string | null;

  @Column({ name: 'account_status', type: 'enum', enum: ['active', 'disabled'], default: 'active' })
  accountStatus!: CustomerAccountStatus;

  @Column({
    name: 'realname_status',
    type: 'enum',
    enum: ['unverified', 'pending', 'verified', 'failed'],
    default: 'unverified',
  })
  realnameStatus!: CustomerRealnameStatus;

  @Column({ name: 'profile_completed', type: 'tinyint', default: 0 })
  profileCompleted!: number;

  @Column({ name: 'register_source', type: 'enum', enum: ['mobile', 'wechat'] })
  registerSource!: CustomerRegisterSource;

  @Column({ name: 'register_device_id', type: 'varchar', length: 64, nullable: true })
  registerDeviceId!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
