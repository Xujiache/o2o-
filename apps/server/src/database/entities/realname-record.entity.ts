import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RealnameRecordStatus = 'pending' | 'success' | 'failed';

@Entity('realname_record')
@Index('idx_user_status', ['userId', 'status'])
@Index('idx_pending', ['status', 'createdAt'])
export class RealnameRecord {
  @PrimaryGeneratedColumn({ name: 'record_id', type: 'bigint' })
  recordId!: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId!: string;

  @Column({ name: 'real_name', type: 'varchar', length: 50 })
  realName!: string;

  @Column({ name: 'id_card_no', type: 'varchar', length: 30 })
  idCardNo!: string;

  @Column({ type: 'enum', enum: ['pending', 'success', 'failed'], default: 'pending' })
  status!: RealnameRecordStatus;

  @Column({ name: 'failed_reason', type: 'varchar', length: 100, nullable: true })
  failedReason!: string | null;

  @Column({ name: 'provider_request_id', type: 'varchar', length: 64, nullable: true })
  providerRequestId!: string | null;

  @Column({ name: 'verified_at', type: 'bigint', nullable: true })
  verifiedAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
