import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantWithdrawalStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'FAILED';

@Entity('merchant_withdrawal')
@Index('uk_merchant_withdrawal_no', ['withdrawalNo'], { unique: true })
@Index('idx_merchant_withdrawal_store_status', ['storeId', 'status', 'submittedAt'])
@Index('idx_merchant_withdrawal_merchant', ['merchantId', 'submittedAt'])
export class MerchantWithdrawal {
  @PrimaryGeneratedColumn({ name: 'merchant_withdrawal_id', type: 'bigint' })
  merchantWithdrawalId!: string;

  @Column({ name: 'withdrawal_no', type: 'varchar', length: 32 })
  withdrawalNo!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ name: 'account_id', type: 'bigint', nullable: true })
  accountId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: MerchantWithdrawalStatus;

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
