import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AfterSaleType = 'REFUND' | 'EXCHANGE';
export type AfterSaleStatus =
  | 'PENDING_MERCHANT'
  | 'APPROVED_BY_MERCHANT'
  | 'REJECTED_BY_MERCHANT'
  | 'PENDING_PLATFORM'
  | 'COMPLETED'
  | 'REFUNDED'
  | 'CANCELLED';

@Entity('after_sale')
@Index('idx_after_sale_order', ['orderId', 'createdAt'])
@Index('idx_after_sale_store_status', ['storeId', 'status', 'createdAt'])
@Index('idx_after_sale_customer_status', ['customerId', 'status', 'createdAt'])
@Index('idx_after_sale_status_applied', ['status', 'appliedAt'])
export class AfterSale {
  @PrimaryGeneratedColumn({ name: 'after_sale_id', type: 'bigint' })
  afterSaleId!: string;

  @Column({ name: 'order_id', type: 'bigint' })
  orderId!: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId!: string;

  @Column({ name: 'merchant_id', type: 'bigint' })
  merchantId!: string;

  @Column({ name: 'store_id', type: 'bigint' })
  storeId!: string;

  @Column({ type: 'varchar', length: 16 })
  type!: AfterSaleType;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  @Column({ name: 'amount_cents', type: 'bigint' })
  amountCents!: string;

  @Column({ type: 'varchar', length: 32, default: 'PENDING_MERCHANT' })
  status!: AfterSaleStatus;

  @Column({ name: 'merchant_review_at', type: 'bigint', nullable: true })
  merchantReviewAt!: string | null;

  @Column({ name: 'merchant_reject_reason', type: 'varchar', length: 255, nullable: true })
  merchantRejectReason!: string | null;

  @Column({ name: 'applied_at', type: 'bigint' })
  appliedAt!: string;

  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: string | null;

  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: string;
}
