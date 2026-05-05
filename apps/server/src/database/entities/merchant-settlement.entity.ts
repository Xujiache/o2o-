import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type MerchantSettlementStatus = 'PENDING' | 'READY' | 'PAID' | 'FAILED';

@Entity('merchant_settlement')
@Index('uk_merchant_settlement_no', ['settlementNo'], { unique: true })
@Index('uk_merchant_settlement_period', ['storeId', 'periodStart', 'periodEnd'], { unique: true })
@Index('idx_merchant_settlement_store_status', ['storeId', 'status', 'createdAt'])
export class MerchantSettlement {
  @PrimaryGeneratedColumn({ name: 'merchant_settlement_id', type: 'bigint' })
  merchantSettlementId!: string;

  @Column({ name: 'settlement_no', type: 'varchar', length: 32 })
  settlementNo!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ name: 'period_start', type: 'bigint' })
  periodStart!: string;

  @Column({ name: 'period_end', type: 'bigint' })
  periodEnd!: string;

  @Column({ name: 'gross_cents', type: 'bigint', default: 0 })
  grossCents!: string;

  @Column({ name: 'commission_cents', type: 'bigint', default: 0 })
  commissionCents!: string;

  @Column({ name: 'fee_cents', type: 'bigint', default: 0 })
  feeCents!: string;

  @Column({ name: 'net_cents', type: 'bigint', default: 0 })
  netCents!: string;

  @Column({ name: 'order_count', type: 'int', default: 0 })
  orderCount!: number;

  @Column({ name: 'refund_count', type: 'int', default: 0 })
  refundCount!: number;

  @Column({ type: 'varchar', length: 16, default: 'PENDING' })
  status!: MerchantSettlementStatus;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'fail_reason', type: 'varchar', length: 255, nullable: true })
  failReason!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
