import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type RiderWithdrawalStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'FAILED';

@Entity('rider_withdrawal')
@Index('uk_rider_withdrawal_no', ['withdrawalNo'], { unique: true })
@Index('idx_rider_withdrawal_rider_status', ['riderId', 'status', 'submittedAt'])
export class RiderWithdrawal {
  @PrimaryGeneratedColumn({ name: 'rider_withdrawal_id', type: 'bigint' })
  riderWithdrawalId!: string;

  @Column({ name: 'withdrawal_no', type: 'varchar', length: 32 })
  withdrawalNo!: string;

  @Column({ name: 'rider_id', type: 'bigint' })
  riderId!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: RiderWithdrawalStatus;

  @Column({ name: 'sms_code_hash', type: 'varchar', length: 128, nullable: true })
  smsCodeHash!: string | null;

  @Column({ name: 'submitted_at', type: 'bigint' })
  submittedAt!: string;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'fail_reason', type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
