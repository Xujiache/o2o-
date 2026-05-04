import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type SmsScene = 'login' | 'realname' | 'change-mobile' | 'sensitive';

@Entity('sms_code')
@Index('idx_mobile_scene', ['mobile', 'scene', 'createdAt'])
@Index('idx_cleanup', ['expireAt'])
export class SmsCode {
  @PrimaryGeneratedColumn({ name: 'code_id', type: 'bigint' })
  codeId!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({ type: 'enum', enum: ['login', 'realname', 'change-mobile', 'sensitive'] })
  scene!: SmsScene;

  @Column({ type: 'char', length: 6 })
  code!: string;

  @Column({ name: 'expire_at', type: 'bigint' })
  expireAt!: string;

  @Column({ name: 'used_at', type: 'bigint', nullable: true })
  usedAt!: string | null;

  @Column({ name: 'client_ip', type: 'varchar', length: 45, nullable: true })
  clientIp!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;
}
